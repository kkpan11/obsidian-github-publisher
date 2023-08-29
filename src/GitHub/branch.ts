import { Octokit } from "@octokit/core";
import i18next from "i18next";
import {Notice } from "obsidian";

import GithubPublisherPlugin from "../main";
import {
	GitHubPublisherSettings,
	RepoFrontmatter,
} from "../settings/interface";
import { logs, noticeLog } from "../utils";
import { FilesManagement } from "./files";


export class GithubBranch extends FilesManagement {
	octokit: Octokit;
	plugin: GithubPublisherPlugin;
	settings: GitHubPublisherSettings;

	constructor(
		octokit: Octokit,
		plugin: GithubPublisherPlugin
	) {
		super(octokit, plugin);
		this.octokit = octokit;
		this.plugin = plugin;
		this.settings = this.plugin.settings;
	}

	/**
	 * Check if RepoFrontmatter is an array or not and run the newBranchOnRepo function on each repo
	 * @param {string} branchName The name of the branch to create
	 * @param {RepoFrontmatter[] | RepoFrontmatter} repoFrontmatter The repo to use
	 */

	async newBranch(
		branchName: string,
		repoFrontmatter: RepoFrontmatter[] | RepoFrontmatter
	) {
		repoFrontmatter = Array.isArray(repoFrontmatter)
			? repoFrontmatter
			: [repoFrontmatter];
		for (const repo of repoFrontmatter) {
			await this.newBranchOnRepo(branchName, repo);
		}
	}

	/**
	 * Create a new branch on the repo named "Vault-date"
	 * Pass if the branch already exists
	 * Run in a loop in the newBranch function if RepoFrontmatter[] is passed
	 * @param {string} branchName The name of the branch to create
	 * @param {RepoFrontmatter} repoFrontmatter The repo to use
	 * @return {Promise<boolean>} True if the branch is created
	 */

	async newBranchOnRepo(
		branchName: string,
		repoFrontmatter: RepoFrontmatter
	): Promise<boolean> {
		const allBranch = await this.octokit.request(
			"GET /repos/{owner}/{repo}/branches",
			{
				owner: repoFrontmatter.owner,
				repo: repoFrontmatter.repo,
			}
		);
		const mainBranch = allBranch.data.find(
			(branch: { name: string }) => branch.name === repoFrontmatter.branch
		);
		if (!mainBranch) return false;
		try {
			const shaMainBranch = mainBranch!.commit.sha;
			const branch = await this.octokit.request(
				"POST /repos/{owner}/{repo}/git/refs",
				{
					owner: repoFrontmatter.owner,
					repo: repoFrontmatter.repo,
					ref: `refs/heads/${branchName}`,
					sha: shaMainBranch,
				}
			);
			noticeLog(
				this.settings,
				i18next.t("publish.branch.success", {branchStatus: branch.status, repo: repoFrontmatter})
			);
			return branch.status === 201;
		} catch (e) {
			// catch the old branch
			try {
				logs(this.settings, e);
				const allBranch = await this.octokit.request(
					"GET /repos/{owner}/{repo}/branches",
					{
						owner: repoFrontmatter.owner,
						repo: repoFrontmatter.repo,
					}
				);
				const mainBranch = allBranch.data.find(
					(branch: { name: string }) => branch.name === branchName
				);
				noticeLog(this.settings, i18next.t("publish.branch.alreadyExists", {branchName, repo: repoFrontmatter}));
				return !!mainBranch;
			} catch (e) {
				logs(this.settings, e);
				return false;
			}
		}
	}

	/**
	 * Create a pull request on repoFrontmatter.branch with the branchName
	 * Run in a loop in the pullRequest function if RepoFrontmatter[] is passed
	 * @param {string} branchName The name of the branch to create
	 * @param {RepoFrontmatter} repoFrontmatter The repo to use
	 * @return {Promise<number>} False in case of error, the pull request number otherwise
	 */

	async pullRequestOnRepo(
		branchName: string,
		repoFrontmatter: RepoFrontmatter,
	): Promise<number> {
		try {
			const PR = await this.octokit.request(
				"POST" + " /repos/{owner}/{repo}/pulls",
				{
					owner: repoFrontmatter.owner,
					repo: repoFrontmatter.repo,
					title: i18next.t("publish.branch.prMessage", {branchName: branchName}),
					body: "",
					head: branchName,
					base: repoFrontmatter.branch,
				}
			);
			return PR.data.number;
		} catch (e) {
			logs(this.settings, e);
			try {
				const PR = await this.octokit.request(
					"GET /repos/{owner}/{repo}/pulls",
					{
						owner: repoFrontmatter.owner,
						repo: repoFrontmatter.repo,
						state: "open",
					}
				);
				return PR.data[0].number;
			} catch (e) {
				noticeLog(
					this.settings,
					i18next.t("publish.branch.error", {error: e, repo: repoFrontmatter})
				);
				logs(this.settings, e);
				return 0;
			}
		}
	}

	/**
	 * After the merge, delete the new branch on the repo
	 * Run in a loop in the updateRepository function if RepoFrontmatter[] is passed
	 * @param {settings} branchName The name of the branch to create
	 * @param {RepoFrontmatter} repoFrontmatter The repo to use
	 * @return {Promise<boolean>} true if the branch is deleted
	 */

	async deleteBranchOnRepo(
		branchName: string,
		repoFrontmatter: RepoFrontmatter
	): Promise<boolean> {
		try {
			const branch = await this.octokit.request(
				"DELETE" +
					" /repos/{owner}/{repo}/git/refs/heads/" +
					branchName,
				{
					owner: repoFrontmatter.owner,
					repo: repoFrontmatter.repo,
				}
			);
			return branch.status === 200;
		} catch (e) {
			return false;
		}
	}

	/**
	 * Automatically merge pull request from the plugin (only if the settings allow it)
	 * Run in a loop in the updateRepository function if RepoFrontmatter[] is passed
	 * @param {string} branchName The name of the branch to create
	 * @param {number} pullRequestNumber  number of the new pullrequest
	 * @param {RepoFrontmatter} repoFrontmatter The repo to use
	 */

	async mergePullRequestOnRepo(
		pullRequestNumber: number,
		repoFrontmatter: RepoFrontmatter
	) {
		const commitMsg = repoFrontmatter.commitMsg || repoFrontmatter.commitMsg.trim().length > 0 ? `${repoFrontmatter.commitMsg} #${pullRequestNumber}` : `[PUBLISHER] Merge #${pullRequestNumber}`;
		try {
			const branch = await this.octokit.request(
				"PUT" + " /repos/{owner}/{repo}/pulls/{pull_number}/merge",
				{
					owner: repoFrontmatter.owner,
					repo: repoFrontmatter.repo,
					pull_number: pullRequestNumber,
					commit_title: commitMsg,
					merge_method: "squash",
				}
			);
			return branch.status === 200;
		} catch (e) {
			logs(this.settings, e);
			new Notice(i18next.t("error.mergeconflic"));
			return false;
		}
	}
	/**
	 * Update the repository with the new branch : PR, merging and deleting the branch if allowed by the global settings
	 * @param {string} branchName The name of the branch to merge
	 * @param {RepoFrontmatter | RepoFrontmatter[]} repoFrontmatter The repo to use
	 * @returns {Promise<boolean>} True if the update is successful
	 */
	async updateRepository(
		branchName: string,
		repoFrontmatter: RepoFrontmatter | RepoFrontmatter[]
	): Promise<boolean> {
		repoFrontmatter = Array.isArray(repoFrontmatter)
			? repoFrontmatter
			: [repoFrontmatter];
		const success: boolean[] = [];
		for (const repo of repoFrontmatter) {
			success.push(await this.updateRepositoryOnOne(branchName, repo));
		}
		return !success.every((value) => value === false);
	}

	/**
	 * Run merging + deleting branch in once, for one repo
	 * Run in a loop in the updateRepository function if RepoFrontmatter[] is passed
	 * @param {string}  branchName The name of the branch to merge
	 * @param {RepoFrontmatter} repoFrontmatter The repo to use
	 * @returns {Promise<boolean>} true if the update is successful
	 */

	async updateRepositoryOnOne(
		branchName: string,
		repoFrontmatter: RepoFrontmatter
	): Promise<boolean> {
		try {
			const pullRequest = await this.pullRequestOnRepo(
				branchName,
				repoFrontmatter
			);
			if (repoFrontmatter.automaticallyMergePR && pullRequest !== 0) {
				const PRSuccess = await this.mergePullRequestOnRepo(
					pullRequest,
					repoFrontmatter
				);
				if (PRSuccess) {
					await this.deleteBranchOnRepo(branchName, repoFrontmatter);
					return true;
				}
				return false;
			}
			return true;
		} catch (e) {
			logs(this.settings, e);
			new Notice(i18next.t("error.errorConfig", {repo: repoFrontmatter})
			);
			return false;
		}
	}



	/**
	 * Use octokit to check if:
	 * - the repo exists
	 * - the main branch exists
	 * Send a notice if the repo doesn't exist or if the main branch doesn't exist
	 * Note: If one of the repo defined in the list doesn't exist, the rest of the list will not be checked because the octokit request throws an error
	 * @param {RepoFrontmatter | RepoFrontmatter[]} repoFrontmatter
	 * @param silent Send a notice if the repo is valid
	 * @return {Promise<void>}
	 */
	async checkRepository(
		repoFrontmatter: RepoFrontmatter | RepoFrontmatter[],
		silent= true): Promise<void>
	{
		repoFrontmatter = Array.isArray(repoFrontmatter)
			? repoFrontmatter
			: [repoFrontmatter];
		for (const repo of repoFrontmatter) {
			try {
				const repoExist = await this.octokit.request("GET /repos/{owner}/{repo}", {
					owner: repo.owner,
					repo: repo.repo,
				}).catch((e) => {
					//check the error code
					if (e.status === 404) {
						new Notice(
							(i18next.t("commands.checkValidity.inRepo.error404", {repo: repo}))
						);
					} else if (e.status === 403) {
						new Notice(
							(i18next.t("commands.checkValidity.inRepo.error403", {repo: repo}))
						);
					} else if (e.status === 301) {
						new Notice(
							(i18next.t("commands.checkValidity.inRepo.error301", {repo:repo}))
						);
					}
				});
				//@ts-ignore
				if (repoExist.status === 200) {
					noticeLog(this.settings, i18next.t("commands.checkValidity.repoExistsTestBranch", {repo}));

					const branchExist = await this.octokit.request("GET /repos/{owner}/{repo}/branches/{branch}", {
						owner: repo.owner,
						repo: repo.repo,
						branch: repo.branch,
					}).catch((e) => {
						//check the error code
						if (e.status === 404) {
							new Notice(
								(i18next.t("commands.checkValidity.inBranch.error404", { repo: repo}))
							);
						} else if (e.status === 403) {
							new Notice(
								(i18next.t("commands.checkValidity.inBranch.error403", {repo: repo}))
							);
						}
					});
					//@ts-ignore
					if (branchExist.status === 200 && !silent) {
						new Notice(
							(i18next.t("commands.checkValidity.success", {repo: repo}))
						);
					}
				}
			} catch (e) {
				break;
			}
		}
	}
}