/* PM2 process config for the Next.js production server.

   On a Lightsail 2GB / 2-CPU box we run TWO instances in cluster mode.
   Pros: when one Next worker is mid-Firestore-roundtrip, the other still
   serves the next request — no head-of-line blocking. PM2 also restarts
   crashed workers automatically.

   Memory: each worker capped at 900MB so a runaway can never OOM the box.

   Usage on the server:
     cd ~/anvbla
     pm2 start deploy/ecosystem.config.cjs
     pm2 save                # remembers the process list across reboots
     pm2 startup             # generates the init script; follow the printed
                             #   command to enable boot-time start. */

module.exports = {
  apps: [
    {
      name: "anvbla",
      cwd: "/home/ubuntu/anvbla",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      // Two workers behind the same port — pm2 round-robins via SO_REUSEPORT.
      // Bump to "max" if/when we move to a bigger box.
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        // Allocate plenty of headroom for the V8 heap — the box has 2GB and
        // each worker is capped at 900M restart, so 768M is comfortably safe.
        NODE_OPTIONS: "--max-old-space-size=768",
        // FIREBASE_*, GEOAPIFY_API_KEY, NEXT_PUBLIC_* etc. read from .env.local
      },
      max_memory_restart: "900M",
      out_file: "/home/ubuntu/.pm2/logs/anvbla-out.log",
      error_file: "/home/ubuntu/.pm2/logs/anvbla-err.log",
      time: true,
      // Graceful restart — wait up to 8s for in-flight requests to finish.
      kill_timeout: 8000,
      wait_ready: false,
      listen_timeout: 10000,
    },
  ],
};
