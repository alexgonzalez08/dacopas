package com.dacopas.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class DacopasFirebaseMessagingService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        String title = "Dacopas";
        String body  = "";
        Map<String, String> data = remoteMessage.getData();

        if (remoteMessage.getNotification() != null) {
            if (remoteMessage.getNotification().getTitle() != null)
                title = remoteMessage.getNotification().getTitle();
            if (remoteMessage.getNotification().getBody() != null)
                body = remoteMessage.getNotification().getBody();
        }
        if (data.containsKey("title")) title = data.get("title");
        if (data.containsKey("body"))  body  = data.get("body");

        String type           = data.getOrDefault("type", "");
        String notificationId = data.getOrDefault("notification_id", "");
        String cookie         = data.getOrDefault("cookie", "");
        String url            = data.getOrDefault("url", "/dashboard");

        showNotification(title, body, type, notificationId, cookie, url);
    }

    private void showNotification(String title, String body, String type,
                                   String notificationId, String cookie, String url) {
        Context ctx    = getApplicationContext();
        int notifId    = (int) System.currentTimeMillis();

        // Intent principal — abrir app en la URL correcta
        Intent openIntent = new Intent(ctx, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("url", url);
        PendingIntent openPending = PendingIntent.getActivity(
            ctx, notifId, openIntent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        // Logo como large icon
        Bitmap largeIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, "dacopas_default")
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setLargeIcon(largeIcon)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(openPending);

        // Botones de acción para solicitudes de amistad
        if ("follow_request".equals(type) && !notificationId.isEmpty()) {
            Intent acceptIntent = new Intent(NotificationActionReceiver.ACTION_ACCEPT);
            acceptIntent.setClass(ctx, NotificationActionReceiver.class);
            acceptIntent.putExtra("notif_id", notifId);
            acceptIntent.putExtra("notification_id", notificationId);
            acceptIntent.putExtra("cookie", cookie);
            PendingIntent acceptPending = PendingIntent.getBroadcast(
                ctx, notifId + 1, acceptIntent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
            );

            Intent declineIntent = new Intent(NotificationActionReceiver.ACTION_DECLINE);
            declineIntent.setClass(ctx, NotificationActionReceiver.class);
            declineIntent.putExtra("notif_id", notifId);
            declineIntent.putExtra("notification_id", notificationId);
            declineIntent.putExtra("cookie", cookie);
            PendingIntent declinePending = PendingIntent.getBroadcast(
                ctx, notifId + 2, declineIntent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
            );

            builder.addAction(0, "✅ Aceptar", acceptPending);
            builder.addAction(0, "❌ Rechazar", declinePending);
        }

        // Botón aceptar para invitaciones a torneos
        if ("league_invite".equals(type) && !notificationId.isEmpty()) {
            Intent acceptIntent = new Intent(NotificationActionReceiver.ACTION_ACCEPT);
            acceptIntent.setClass(ctx, NotificationActionReceiver.class);
            acceptIntent.putExtra("notif_id", notifId);
            acceptIntent.putExtra("notification_id", notificationId);
            acceptIntent.putExtra("cookie", cookie);
            PendingIntent acceptPending = PendingIntent.getBroadcast(
                ctx, notifId + 1, acceptIntent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
            );
            builder.addAction(0, "🏆 Ver torneo", acceptPending);
        }

        NotificationManager manager = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(notifId, builder.build());
    }
}
