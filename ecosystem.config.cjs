module.exports = {
  apps: [
    {
      name: "heard-sheep",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        NEXT_PUBLIC_BASE_PATH: "/sheep"
      },
      max_memory_restart: "512M",
      time: true
    }
  ]
};
