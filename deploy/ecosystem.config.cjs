/* PM2 process config for the Next.js production server. PM2 keeps the
   Node process alive across crashes + reboots, and gives us a simple
   `pm2 logs anvbla` for tailing.

   Usage on the server:
     cd ~/anvbla
     pm2 start deploy/ecosystem.config.cjs
     pm2 save
     pm2 startup    # follow the printed command so PM2 starts on reboot

   The 2GB Lightsail box can comfortably run a single instance of next
   start. Bump `instances` to "max" or 2 only if you need horizontal
   scale (and put the cluster behind nginx's upstream block). */

module.exports = {
  apps: [
    {
      name: "anvbla",
      cwd: "/home/ubuntu/anvbla",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        // Everything else (FIREBASE_*, GEOAPIFY_API_KEY, NEXT_PUBLIC_*) is
        // read from .env.local in the project root — Next.js loads it
        // automatically on `next start`. Don't duplicate them here, so
        // secrets stay in one place.
      },
      max_memory_restart: "900M",
      out_file: "/home/ubuntu/.pm2/logs/anvbla-out.log",
      error_file: "/home/ubuntu/.pm2/logs/anvbla-err.log",
      time: true,
    },
  ],
};
