import fs from "fs";
import path from "path";
export default async function prismaEngineIntegrity({ root } = {}) {
	const issues = [];
	const logs = [];

	try {
		const schemaPath = new URL("../../backend/prisma/schema.prisma", import.meta.url).pathname.replace(/^\//, "").replace(/\//g, path.sep);
		if (!fs.existsSync(schemaPath)) {
			issues.push("schema.prisma not found at " + schemaPath);
		} else {
			logs.push("Found schema.prisma at " + schemaPath);
		}
	} catch (err) {
		issues.push("Error checking schema.prisma: " + err.message);
	}

	// Node version check
	const nodeVersion = process.version;
	const major = parseInt(nodeVersion.replace("v", "").split(".")[0], 10);
	if (major < 18) {
		issues.push(`Node version too low: ${nodeVersion}`);
	}

	// Prisma Client install check
	try {
		const pkgJson = JSON.parse(
			fs.readFileSync(new URL("../../package.json", import.meta.url).pathname.replace(/^\//, "").replace(/\//g, path.sep), "utf8")
		);
		if (!pkgJson.dependencies || !pkgJson.dependencies["@prisma/client"]) {
			issues.push("@prisma/client is not installed.");
		}
	} catch (err) {
		issues.push("Could not read package.json: " + err.message);
	}

	// Rogue env vars
	["PRISMA_CLIENT_ENGINE_TYPE", "PRISMA_ACCELERATE_URL"].forEach((key) => {
		if (process.env[key]) {
			issues.push(`Unexpected environment variable detected: ${key}`);
		}
	});

	// Prisma binary existence
	const prismaFolder = new URL("../../node_modules/.prisma", import.meta.url).pathname.replace(/^\//, "").replace(/\//g, path.sep);
	if (!fs.existsSync(prismaFolder)) {
		issues.push("Prisma engine folder missing: node_modules/.prisma");
	}

	// Prisma CLI availability
	try {
		execSync("npx prisma -v", { stdio: "ignore" });
	} catch (err) {
		issues.push("Prisma CLI not available.");
	}

	if (issues.length > 0) {
		return {
			id: "prisma-engine-integrity",
			status: "FAIL",
			issues,
			logs,
		};
	} else {
		return {
			id: "prisma-engine-integrity",
			status: "PASS",
			issues: [],
			logs,
		};
	}
}
