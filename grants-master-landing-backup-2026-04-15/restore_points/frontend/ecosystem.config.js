module.exports = {
  apps: [
    {
      name: "tgm-backend",
      script: "backend/server.js",
      cwd: "./",
      watch: ["backend"],
      ignore_watch: ["backend/node_modules", "backend/ed"],
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "tgm-frontend",
      script: "npm",
      args: "run preview",
      cwd: "./frontend",
      watch: false,
      env: {
        NODE_ENV: "production"
      },
      autorestart: true
    },
    {
      name: "tgm-ed-watchdog",
      script: "backend/ed/watchdog-daemon.js",
      cwd: "./",
      watch: ["backend/ed/modules"],
      ignore_watch: ["backend/ed/node_modules"],
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
