# 🧬 Kendi Kendini Yeniden Yazan Site

Her gün bir LLM, ziyaretçi yorumlarını okuyup bu sitenin kodunu değiştiriyor.
Commit geçmişi herkese açık; sitenin **evrimini** gün gün izleyebilirsin.

- Site: `https://novamun.org/evolve/`
- Zaman makinesi: `https://novamun.org/evolve/evolution.html`
- Kurallar: [CONSTITUTION.md](CONSTITUTION.md)

## Nasıl çalışıyor?

```
ziyaretçi ──► "Siteyi değiştir" (shell.js) ──► GitHub Issue [feedback]  ◄── 👍 oylar
                                                       │
            her gün 06:17 UTC ── .github/workflows/evolve.yml
                                                       │
     index.html + son 10 günün hafızası + yorumlar ──► Claude ──► yeni index.html
                                                       │
                                     validate.mjs (anayasa kontrolü, 3 deneme)
                                                       │
                      commit "Gün N: …" ──► GitHub Pages ──► issue'lara cevap + kapat
```

| Dosya | Kim yazar? | Ne işe yarar |
|---|---|---|
| `index.html` | **LLM** (her gün) | Sitenin kendisi. Tek dosya, tüm CSS/JS satır içi. |
| `evolution.json` | script | Günlük: başlık, özet, uygulanan/reddedilen istekler. |
| `shell.js` | insan (dokunulmaz) | Yorum kutusu, oylar, gün sayacı, geri sayım. Shadow DOM içinde, LLM'in CSS'i bozamaz. |
| `evolution.html` | insan (dokunulmaz) | Zaman makinesi: her günü git geçmişinden (`raw.githubusercontent.com/<sha>`) sandbox'lı iframe'de canlandırır. |
| `CONSTITUTION.md` | insan | LLM'in her gün okuduğu kurallar. |
| `scripts/evolve.mjs` | insan | Yorumları toplar, Claude'u çağırır, doğrular, yazar, issue'lara cevap verir. |
| `scripts/validate.mjs` | insan | Harici script, yönlendirme, ağ isteği, iframe, çerez vb. yasak; kabuk satırı zorunlu. |

### Güvenlik
- Yorumlar modele `<comment>` içinde **güvenilmez veri** olarak verilir; anayasa yorumlardan üstündür.
- Model sadece `evolve/index.html` yazabilir; çıktı `validate.mjs`'ten geçmezse hata modele geri verilir (en fazla 3 deneme), yine geçmezse o gün değişiklik olmaz.
- Sayfa harici kod yükleyemez, ağ isteği atamaz, yönlendiremez → spam yorum siteyi ele geçiremez.
- Spam bir issue'ya `evolve-ignore` etiketi koyarsan model onu hiç görmez.
- Bir gün kötü giderse: `git revert <sha>` — evrim de geri alınabilir.

## Kurulum (bir kerelik)

1. **Secret:** Repo → Settings → Secrets and variables → Actions → `ANTHROPIC_API_KEY`.
2. **Etiket:** `feedback` etiketi issue şablonuyla otomatik eklenir; etiket yoksa Issues → Labels'tan oluştur.
3. **Workflow izni:** Settings → Actions → General → Workflow permissions → *Read and write*.
4. Bu dalı `main`'e birleştir (zamanlanmış workflow'lar sadece varsayılan dalda çalışır).
5. İlk evrimi elle tetikle: Actions → **Evolve** → *Run workflow* (`dry_run` ile önce deneyebilirsin).

### İsteğe bağlı değişkenler (Settings → Variables)
| Değişken | Varsayılan | |
|---|---|---|
| `EVOLVE_MODEL` | `claude-opus-5-5` | Kullanılan model |
| `EVOLVE_EFFORT` | `high` | `low` … `max` — düşük = ucuz |
| `EVOLVE_QUIET` | `improvise` | Yorum yoksa: `improvise` (kendi küçük fikri) / `skip` (o gün değişmez) |
| `EVOLVE_SITE_URL` | `https://novamun.org/evolve/` | Issue cevaplarındaki link |

## Yerelde deneme

```bash
cd evolve/scripts && npm ci
node validate.mjs ../index.html                        # anayasa kontrolü
ANTHROPIC_API_KEY=… GITHUB_TOKEN=… node evolve.mjs --dry-run   # hiçbir şey yazmadan bir günü dene
python3 -m http.server -d ..                           # http://localhost:8000
```

> Zaman makinesi günleri commit mesajındaki `Gün N:` önekiyle eşleştirir — elle yapılan düzeltmelerde bu öneki kullanma.
