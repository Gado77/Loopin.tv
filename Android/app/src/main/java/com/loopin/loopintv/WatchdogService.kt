package com.loopin.loopintv

import android.app.*
import android.content.Intent
import android.os.*
import android.os.Handler

class WatchdogService : Service() {

    private val handler = Handler(Looper.getMainLooper())

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForegroundCompat()
        startWatching()
        return START_STICKY
    }

    private fun startForegroundCompat() {
        val channelId = "loopin_watchdog"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Loopin Player",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }

        // Notification.Builder(context, channelId) é API 26+
        // No Android 7.1 usa o construtor sem channelId
        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, channelId)
                .setContentTitle("Loopin TV")
                .setContentText("Player ativo")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("Loopin TV")
                .setContentText("Player ativo")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .build()
        }

        startForeground(1, notification)
    }

    private fun startWatching() {
        handler.postDelayed(object : Runnable {
            override fun run() {
                val am = getSystemService(ACTIVITY_SERVICE) as ActivityManager

                @Suppress("DEPRECATION")
                val topActivity = am.getRunningTasks(1)
                    ?.firstOrNull()?.topActivity

                val appEmForeground = topActivity?.packageName == packageName

                if (!appEmForeground) {
                    android.util.Log.d("WatchdogService", "App fora de foreground — reabrindo em 2min")
                    handler.postDelayed({
                        val launch = Intent(applicationContext, MainActivity::class.java).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                        }
                        startActivity(launch)
                    }, 15_000)
                }

                handler.postDelayed(this, 30_000)
            }
        }, 30_000)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        startService(Intent(applicationContext, WatchdogService::class.java))
    }
}