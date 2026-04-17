
import prismaEngineIntegrity from "./modules/prismaEngineIntegrity.js";
import prismaMigrationSafety from "./modules/prismaMigrationSafety.js";
import prismaMigrationIntegrity from "./modules/prisma-migration-integrity.js";
import backendBootIntegrity from "./modules/backendBootIntegrity.js";
import path from "path";
import process from "process";

async function runED() {
	const root = process.cwd();

	const checks = [
		prismaEngineIntegrity,
		prismaMigrationSafety,
		prismaMigrationIntegrity,
		backendBootIntegrity,
	];

	console.log("🔍 ED: Running boot integrity checks...\n");

	for (const check of checks) {
		const result = await check({ root });

		console.log(`🧩 ${result.id}: ${result.status}`);

		if (result.logs?.length) {
			for (const log of result.logs) console.log(`   • ${log}`);
		}

		if (result.issues?.length) {
			console.log("\n❌ Issues detected:");
			for (const issue of result.issues) console.log(`   - ${issue}`);
		}

		if (result.status === "FAIL") {
			console.log("\n⛔ ED blocked backend startup due to integrity failure.\n");
			return;
		}

		console.log("");
	}

	console.log("✅ All ED checks passed. Backend is safe to start.\n");
}

runED();
