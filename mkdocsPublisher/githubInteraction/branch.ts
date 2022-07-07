import {Octokit} from "@octokit/core";
import {MkdocsPublicationSettings} from "../settings/interface";
import {FilesManagement} from "./filesManagement";
import {MetadataCache, Vault, Notice} from "obsidian";

export class GithubBranch extends FilesManagement {
	settings: MkdocsPublicationSettings;
	octokit: Octokit;
	vault: Vault;
	metadataCache: MetadataCache;

	constructor(settings: MkdocsPublicationSettings, octokit: Octokit, vault: Vault, metadataCache: MetadataCache) {
		super(vault, metadataCache, settings, octokit);
		this.settings = settings;
		this.octokit = octokit;
	}
	
	async getMasterBranch() {
		const allBranch = await this.octokit.request('GET' + ' /repos/{owner}/{repo}/branches', {
			owner: this.settings.githubName,
			repo: this.settings.githubRepo,
		});
		const mainBranch = allBranch.data.find((branch: { name: string; }) => branch.name === 'main' || branch.name === 'master');
		return mainBranch.name;
	}
	
	async newBranch(branchName: string) {
		const allBranch = await this.octokit.request('GET' + ' /repos/{owner}/{repo}/branches', {
			owner: this.settings.githubName,
			repo: this.settings.githubRepo,
		});
		const mainBranch = allBranch.data.find((branch: { name: string; }) => branch.name === 'main' || branch.name === 'master');
		const shaMainBranch = mainBranch.commit.sha;
		try {
			const branch = await this.octokit.request(
				"POST" + " /repos/{owner}/{repo}/git/refs",
				{
					owner: this.settings.githubName,
					repo: this.settings.githubRepo,
					ref: "refs/heads/" + branchName,
					sha: shaMainBranch,
				}
			);
			return branch.status === 201;
		} catch (e) {
			// catch the old branch
			const allBranch = await this.octokit.request('GET' + ' /repos/{owner}/{repo}/branches', {
				owner: this.settings.githubName,
				repo: this.settings.githubRepo,
			});
			const mainBranch = allBranch.data.find((branch: { name: string; }) => branch.name === branchName);
			return !!mainBranch;
		}
	}

	async pullRequest(branchName: string) {
		return await this.octokit.request('POST' +
			' /repos/{owner}/{repo}/pulls', {
			owner: this.settings.githubName,
			repo: this.settings.githubRepo,
			title: `PullRequest ${branchName} from Obsidian`,
			body: "",
			head: branchName,
			base: "main",
		});
	}

	async deleteBranch(branchName: string) {
		const octokit = new Octokit({
			auth: this.settings.GhToken,
		});
		try {
			const branch = await octokit.request(
				"DELETE" + " /repos/{owner}/{repo}/git/refs/heads/" + branchName,
				{
					owner: this.settings.githubName,
					repo: this.settings.githubRepo,
				}
			);
			return branch.status === 200;
		} catch (e) {
			return false;
		}
	}


	async mergePullRequest (branchName: string, silent = false, pullRequestNumber: number) {
		new Notice('Trying to merge request with pull request number ' + pullRequestNumber + ' in ' + branchName);
		const octokit = new Octokit({
			auth: this.settings.GhToken,
		});
		const branch = await octokit.request(
			"PUT" + " /repos/{owner}/{repo}/pulls/{pull_number}/merge",
			{
				owner: this.settings.githubName,
				repo: this.settings.githubRepo,
				pull_number: pullRequestNumber,
				commit_title: `[PUBLISHER] Merge #${pullRequestNumber}`,
				merge_method: "squash",
			}
		);
		return branch.status === 200;
	}
	async updateRepository(branchName: string) {
		new Notice(`Update repository with ${branchName}`)
		const pullRequest = await this.pullRequest(branchName);
		// @ts-ignore
		await this.mergePullRequest(branchName, true, pullRequest.data.number);
		await this.deleteBranch(branchName);
		return true
	}
}
