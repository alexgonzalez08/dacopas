package com.dacopas.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.AsyncTask;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class NotificationActionReceiver extends BroadcastReceiver {

    public static final String ACTION_ACCEPT  = "com.dacopas.app.ACTION_ACCEPT";
    public static final String ACTION_DECLINE = "com.dacopas.app.ACTION_DECLINE";

    @Override
    public void onReceive(Context context, Intent intent) {
        int notifId       = intent.getIntExtra("notif_id", 0);
        String action     = intent.getAction();
        String notifDbId  = intent.getStringExtra("notification_id");
        String cookie     = intent.getStringExtra("cookie");

        // Cerrar la notificación inmediatamente
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(notifId);

        if (notifDbId == null || cookie == null) return;

        // Llamar al API en background
        String endpoint = ACTION_ACCEPT.equals(action)
            ? "https://www.dacopas.com/api/notifications/action?action=accept&id=" + notifDbId
            : "https://www.dacopas.com/api/notifications/action?action=decline&id=" + notifDbId;

        new AsyncTask<String, Void, Void>() {
            @Override
            protected Void doInBackground(String... params) {
                try {
                    URL url = new URL(params[0]);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Cookie", params[1]);
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);
                    OutputStream os = conn.getOutputStream();
                    os.write("{}".getBytes());
                    os.close();
                    conn.getResponseCode();
                    conn.disconnect();
                } catch (Exception e) {
                    e.printStackTrace();
                }
                return null;
            }
        }.execute(endpoint, cookie);
    }
}
