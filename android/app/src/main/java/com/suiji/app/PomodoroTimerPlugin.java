package com.suiji.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.text.format.DateFormat;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Date;

/**
 * 计时进行中的常驻通知：通知栏和锁屏都能看到倒计时。
 *
 * 运行中用系统 chronometer 倒计时（由 SystemUI 渲染，应用退到后台或进程被回收
 * 也不会停），暂停时改成静态剩余时间；到达结束时间后通知自动消失，由
 * LocalNotifications 预约的完成提醒接手。
 */
@CapacitorPlugin(name = "PomodoroTimer")
public class PomodoroTimerPlugin extends Plugin {

    private static final String CHANNEL_ID = "pomodoro-timer";
    private static final String ALERT_SOUND_CHANNEL_ID = "pomodoro-alert-sound";
    private static final String ALERT_QUIET_CHANNEL_ID = "pomodoro-alert-quiet";
    private static final int NOTIFICATION_ID = 41002;
    /** 暂停状态下的兜底清理时间，避免进程被杀后通知永久残留。 */
    private static final long PAUSED_TIMEOUT_MS = 12L * 60L * 60L * 1000L;
    /** 结束提醒通知渠道的震动节奏：1 秒长震。 */
    private static final long[] ALERT_VIBRATION = new long[] { 0L, 1000L };
    /** 每种模式用独立的 requestCode，自动进入下一轮时不会覆盖刚触发的震动。 */
    private static final int ALERT_REQUEST_FOCUS = 41010;
    private static final int ALERT_REQUEST_SHORT_BREAK = 41011;
    private static final int ALERT_REQUEST_LONG_BREAK = 41012;

    @Override
    public void load() {
        ensureChannel();
        ensureAlertChannels();
    }

    @PluginMethod
    public void show(PluginCall call) {
        Context context = getContext();
        if (!hasNotificationPermission(context)) {
            call.reject("notification permission not granted");
            return;
        }
        ensureChannel();

        String title = call.getString("title", "计时中");
        String body = call.getString("body", "");
        boolean paused = Boolean.TRUE.equals(call.getBoolean("paused", false));
        Long endsAtValue = call.getLong("endsAt");
        Long remainingValue = call.getLong("remainingMs");
        long endsAt = endsAtValue != null ? endsAtValue : 0L;
        long remainingMs = remainingValue != null ? remainingValue : 0L;
        long now = System.currentTimeMillis();

        long end = 0L;
        String contentText = body;
        if (!paused) {
            end = endsAt > now ? endsAt : now + Math.max(1000L, remainingMs);
            // 通知正文直接写出结束时间，锁屏上也能一眼看到时间；
            // 右侧的系统 chronometer 继续实时倒计时。
            String endTime = DateFormat.getTimeFormat(context).format(new Date(end));
            contentText = endTime + " 结束" + (body.isEmpty() ? "" : " · " + body);
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_timer)
            .setContentTitle(title)
            .setContentText(contentText)
            .setSubText("τί")
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setColor(0xFF1E6F8C);

        if (paused) {
            builder.setWhen(now);
            builder.setShowWhen(false);
            builder.setUsesChronometer(false);
            builder.setTimeoutAfter(PAUSED_TIMEOUT_MS);
        } else {
            builder.setWhen(end);
            builder.setShowWhen(true);
            builder.setUsesChronometer(true);
            builder.setChronometerCountDown(true);
            // 进程被系统回收时，通知到点自动消失，不会留下一个永远 00:00 的倒计时。
            builder.setTimeoutAfter(Math.max(1000L, end - now));
        }

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build());
            call.resolve();
        } catch (SecurityException error) {
            call.reject("notification permission not granted", error);
        }
    }

    @PluginMethod
    public void hide(PluginCall call) {
        NotificationManagerCompat.from(getContext()).cancel(NOTIFICATION_ID);
        call.resolve();
    }

    /**
     * 预约本轮结束时的震动闹钟。即使 App 在后台、锁屏或进程被回收，
     * 只要闹钟还能触发，就会在结束时间点震动。
     */
    @PluginMethod
    public void scheduleAlert(PluginCall call) {
        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Long endsAtValue = call.getLong("endsAt");
        if (alarmManager == null || endsAtValue == null) {
            call.reject("invalid alert");
            return;
        }

        String kind = call.getString("kind", "focusEnd");
        int requestCode = alertRequestCode(kind);
        long triggerAt = Math.max(System.currentTimeMillis() + 1000L, endsAtValue);

        Intent intent = new Intent(context, PomodoroAlertReceiver.class);
        intent.setAction(PomodoroAlertReceiver.ACTION);
        intent.putExtra(PomodoroAlertReceiver.EXTRA_KIND, kind);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        try {
            if (
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                !alarmManager.canScheduleExactAlarms()
            ) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            } else {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            }
            call.resolve();
        } catch (SecurityException error) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            call.resolve();
        }
    }

    @PluginMethod
    public void cancelAlerts(PluginCall call) {
        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        int[] requestCodes = new int[] {
            ALERT_REQUEST_FOCUS,
            ALERT_REQUEST_SHORT_BREAK,
            ALERT_REQUEST_LONG_BREAK,
        };
        for (int requestCode : requestCodes) {
            Intent intent = new Intent(context, PomodoroAlertReceiver.class);
            intent.setAction(PomodoroAlertReceiver.ACTION);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            if (alarmManager != null) alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
        }
        call.resolve();
    }

    private int alertRequestCode(String kind) {
        if ("shortBreakEnd".equals(kind)) return ALERT_REQUEST_SHORT_BREAK;
        if ("longBreakEnd".equals(kind)) return ALERT_REQUEST_LONG_BREAK;
        return ALERT_REQUEST_FOCUS;
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        Context context = getContext();
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "计时进行中",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("番茄钟运行时在通知栏和锁屏显示倒计时");
        channel.setShowBadge(false);
        channel.setSound(null, null);
        channel.enableVibration(false);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(channel);
    }

    /**
     * 结束提醒的两个渠道由原生层创建，这样才能给渠道设置明确的震动节奏。
     * 只靠 LocalNotifications 创建时 vibration 为 true、pattern 为 null，
     * 部分 ROM（如 MIUI）不会震动。
     */
    private void ensureAlertChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        Context context = getContext();
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;

        // 旧版本由 JS 创建的渠道没有震动节奏，升级后删掉（已删除则跳过）。
        if (manager.getNotificationChannel("pomodoro-sound") != null) {
            manager.deleteNotificationChannel("pomodoro-sound");
        }
        if (manager.getNotificationChannel("pomodoro-quiet") != null) {
            manager.deleteNotificationChannel("pomodoro-quiet");
        }
        if (manager.getNotificationChannel("pomodoro-silent") != null) {
            manager.deleteNotificationChannel("pomodoro-silent");
        }

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        Uri soundUri = Uri.parse(
            "android.resource://" + context.getPackageName() + "/" + R.raw.pomodoro
        );

        NotificationChannel sound = new NotificationChannel(
            ALERT_SOUND_CHANNEL_ID,
            "番茄时钟提醒",
            NotificationManager.IMPORTANCE_HIGH
        );
        sound.setDescription("专注与休息结束的提示音和震动");
        sound.enableVibration(true);
        sound.setVibrationPattern(ALERT_VIBRATION);
        sound.enableLights(true);
        sound.setSound(soundUri, audioAttributes);
        manager.createNotificationChannel(sound);

        NotificationChannel quiet = new NotificationChannel(
            ALERT_QUIET_CHANNEL_ID,
            "番茄时钟静默提醒",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        quiet.setDescription("不播放提示音，用震动提醒");
        quiet.enableVibration(true);
        quiet.setVibrationPattern(ALERT_VIBRATION);
        quiet.enableLights(true);
        quiet.setSound(null, null);
        manager.createNotificationChannel(quiet);
    }

    private boolean hasNotificationPermission(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
        }
        return NotificationManagerCompat.from(context).areNotificationsEnabled();
    }
}
