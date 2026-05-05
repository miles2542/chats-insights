import type { FileNode } from "../store";

export const buildTree = (files: File[]): FileNode[] => {
	const root: FileNode[] = [];
	for (const file of files) {
		const path = file.webkitRelativePath || file.name;
		const parts = path.split("/");
		let currentLevel = root;
		let currentPath = "";

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			const isLast = i === parts.length - 1;

			let node = currentLevel.find((n) => n.name === part);
			if (!node) {
				node = {
					id: crypto.randomUUID(),
					name: part,
					type: isLast ? "file" : "folder",
					path: currentPath,
					children: isLast ? undefined : [],
					rawFile: isLast ? file : undefined,
				};
				currentLevel.push(node);
			}
			if (node.children) {
				currentLevel = node.children;
			}
		}
	}
	return root;
};
