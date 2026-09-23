package com.boasorte.agrogestao;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "AppUpdateInstaller")
public class AppUpdateInstallerPlugin extends Plugin {

    @PluginMethod
    public void getAppVersion(PluginCall call) {
        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();
            PackageInfo pInfo = pm.getPackageInfo(context.getPackageName(), 0);
            String versionName = pInfo.versionName != null ? pInfo.versionName : "1.0";
            long versionCode;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                versionCode = pInfo.getLongVersionCode();
            } else {
                versionCode = pInfo.versionCode;
            }

            JSObject ret = new JSObject();
            ret.put("versionName", versionName);
            ret.put("versionCode", versionCode);
            ret.put("packageName", context.getPackageName());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao obter versão nativa do aplicativo: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void installApkFromBase64(PluginCall call) {
        String base64Data = call.getString("base64");
        String fileName = call.getString("fileName", "update.apk");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Dados Base64 do APK não foram fornecidos.");
            return;
        }

        try {
            Context context = getContext();
            File cacheDir = context.getExternalCacheDir() != null ? context.getExternalCacheDir() : context.getCacheDir();
            File apkFile = new File(cacheDir, fileName);

            if (apkFile.exists()) {
                apkFile.delete();
            }

            byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);
            try (FileOutputStream fos = new FileOutputStream(apkFile)) {
                fos.write(decodedBytes);
                fos.flush();
            }

            launchApkInstaller(apkFile, call);
        } catch (Exception e) {
            call.reject("Erro ao salvar e preparar APK: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void openBrowserDownload(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("URL de download inválida.");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao abrir navegador: " + e.getMessage(), e);
        }
    }

    private void launchApkInstaller(File apkFile, PluginCall call) {
        try {
            Context context = getContext();
            String authority = context.getPackageName() + ".fileprovider";
            Uri apkUri = FileProvider.getUriForFile(context, authority, apkFile);

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            context.startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Instalador iniciado com sucesso.");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao disparar instalador do Android: " + e.getMessage(), e);
        }
    }
}
