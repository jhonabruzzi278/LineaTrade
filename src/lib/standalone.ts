// Detecta si la app corre "instalada" (PWA agregada a inicio, o la TWA del
// APK de Play Store) en vez de en una pestaña normal del navegador.
// display-mode: standalone cubre PWA instalada en Chrome/Edge y la TWA;
// navigator.standalone cubre Safari/iOS (no soporta display-mode); el
// referrer android-app:// es la señal específica de TWA que documenta
// Google, por si el media query todavía no resolvió a tiempo del primer
// render.
export function isStandaloneDisplay(): boolean {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    iosStandalone ||
    document.referrer.startsWith('android-app://')
  )
}
