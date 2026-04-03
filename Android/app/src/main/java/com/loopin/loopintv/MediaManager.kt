package com.loopin.loopintv

import android.content.Context
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream

class MediaManager(private val context: Context) {
    private val client = OkHttpClient()

    // Verifica se o vídeo já está baixado, se não, baixa.
    fun prepareVideo(url: String): String? {
        val fileName = url.substringAfterLast("/").substringBefore("?")
        val file = File(context.filesDir, fileName)

        if (file.exists() && file.length() > 0) return file.absolutePath

        return try {
            val request = Request.Builder().url(url).build()
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return null

            response.body?.byteStream()?.use { input ->
                FileOutputStream(file).use { output ->
                    input.copyTo(output)
                }
            }
            file.absolutePath
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}