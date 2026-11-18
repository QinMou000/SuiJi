package com.suiji.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;

/**
 * 计时结束的震动提醒。
 *
 * 用 AlarmManager 精确闹钟触发，而不是依赖通知渠道的震动：
 * 通知渠道的震动在部分 ROM（如 MIUI）上会被静音/前台策略吞掉，
 * 闹钟广播直接调用 Vibrator 更可靠，锁屏和后台也能生效。
 */
public class PomodoroAlertReceiver extends BroadcastReceiver {

    public static final String ACTION = "com.suiji.app.POMODORO_ALERT";
    public static final String EXTRA_KIND = "kind";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION.equals(intent.getAction())) return;

        Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) return;

        // 1 秒、最大振幅（255）。不同模式的节奏不再区分，统一给最强提醒。
        VibrationEffect effect = VibrationEffect.createOneShot(1000L, 255);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+：用 ALARM 用途，避免后台震动被系统按“后台应用”拦掉。
            VibrationAttributes attributes = new VibrationAttributes.Builder()
                .setUsage(VibrationAttributes.USAGE_ALARM)
                .build();
            vibrator.vibrate(effect, attributes);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build();
            vibrator.vibrate(effect, attributes);
        } else {
            vibrator.vibrate(1000L);
        }
    }
}
