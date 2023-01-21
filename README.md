## GitHub Publisher

Publish your notes in your own GitHub repository for free and do whatever you want with them. ✨

This allows you to set up any template: Jekyll, Mkdocs, Hugo, and custom-made ones!

## Docs

[All documentation can be found here](https://obsidian-publisher.netlify.app/)

Here, you will only get a quick setup!

## Features

- Converting `[[wikilinks]]` to markdown links
- Linking to other notes and updating the links according to your settings
- Cleaning the repo by removing depublished and deleted files
- Folder notes (renaming them to a specific name, like `index.md`)
- Simple Dataview queries (not DataviewJs)
- Supporting any markdown syntax supported by your template, as well as other formats like Mermaid or Latex
- And many more :sparkles:

> **Warning**  
> Do not use this plugin to sync or save your Obsidian Vault!  
> Avoid opening the converted files from your repository in Obsidian!  

---

## Initial setup

There are a lot of options available, some of which are pre-configured and others are optional.

Before you begin, you will need to configure your Github repository.

1. Fill in your username, repository name, and branch.
2. Generate a Github token from the settings link and paste it here.
3. Click the button to check if everything is working as intended.
4. Now, let's try publishing your first note. To do this, you need to set the key `share: true` in the frontmatter of a file, like this:
	```
	---
	share: true
	---
	```
5. Now, run the command to publish: `Upload single current active note`
6. If everything is good, a PR will be created on your repository and will be automatically merged (this can be disabled if desired!).

That's it! However, there are many options that a simple README cannot cover, so please refer to the documentation for more information. 💕.

---

## Usage

The plugin adds seven commands, one of which is also available in the right-click menu.

- `Upload single current active note`
- `Upload all notes`
- `Upload unpublished notes`
- `Refresh published and upload new notes`
- `Refresh all published notes`
- `Purge depublished and deleted files`
- `Test the connection to the configured repository`

Each command is explained [here](https://github.com/ObsidianPublisher/obsidian-github-publisher/blob/master/docs/en/COMMANDS.md).

## Developing

Check [here](https://github.com/ObsidianPublisher/obsidian-github-publisher/blob/master/docs/en/DEVELOPPING.md) if you want to help the plugin development.

---

## Looking for something?

→ [Settings explanation](https://obsidian-publisher.netlify.app/en/Obsidian/Settings/)
← [Commands references](https://obsidian-publisher.netlify.app/en/Obsidian/Commands)
→ [Template](https://obsidian-publisher.netlify.app/en/Getting%20Started/)
← [Developing](https://obsidian-publisher.netlify.app/en/Obsidian/Developping)

---

If you find this plugin and workflow useful, you can give me some coffee money : <br>
<a href='https://ko-fi.com/X8X54ZYAV' target='_blank'><img height='36' style='border:0px;height:36px;display:block;margin-left:50%;' src='https://cdn.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>


