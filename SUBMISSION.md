# 🎬 Submission Kit — VeilPay (WTF Hackathon)

## A. Demo Video Script (max 4 min)

**Setup before recording:**
- Laptop dengan MetaMask (network Sepolia), saldo testnet cukup.
- Buka `https://veilpay.space` (live dApp — desktop wallet MetaMask/Rabby, or scan WalletConnect on mobile)
- Buka Etherscan contract: `https://sepolia.etherscan.io/address/0x1012B372bA9b9BdB980a0B8D21973eb791CC7473`

**Narasi (baca santai, tunjukin layar):**

> [0:00–0:30] "Halo, ini VeilPay — payroll on-chain tapi gajinya
> rahasia. Masalahnya: payroll biasa di chain, gaji semua orang keliatan
> publik. Kita benerin itu pakai iExec Nox — gaji terenkripsi, cuma yang
> berhak yang bisa baca."
>
> [0:30–1:15] (Buka dApp) "Ini dashboard employer. Masukin alamat karyawan
> + nominal gaji, klik Encrypt & Assign. Perhatikan: angkanya dienkripsi
> OFF-CHAIN di enclave TEE — yang masuk ke chain cuma handle 32-byte, bukan
> angka." (klik, tunjuk konfirmasi MetaMask + tx)
>
> [1:15–2:15] (Etherscan) "Di explorer, kita cuma lihat handle opaque. Gaji
> 5000? nggak ada. Privacy kejaga." (scroll events)
>
> [2:15–3:15] (Switch ke view Employee) "Sekarang karyawan buka tab sendiri,
> klik Decrypt My Salary — gasless, ACL-gated. Cuma dia yang bisa baca.
> Hasil: 5000. Orang lain coba decrypt = ditolak."
>
> [3:15–4:00] "Klik Claim → saldo reset ke nol terenkripsi. Selesai. Public
> infra tetap transparan, cuma angkanya yang private. Built on iExec Nox.
> Link di bio. #WTFHackathon"

**Tips:** rekam 1080p, suara jelas, jangan lewat 4 menit. Upload ke YouTube
unlisted / atau X native video.

---

## B. Submit Checklist (DoraHacks BUIDL)

1. **GitHub public** → push repo ini (`wtf-nox-payroll`). Pastikan `.env`
   TIDAK ikut (sudah di .gitignore).
2. **Buka** https://dorahacks.io/hackathon/wtf-hackathon/buidl → "Submit BUIDL"
3. Isi:
   - Project name: `VeilPay`
   - Description: copy dari README "The Problem / The Solution"
   - Repo URL: GitHub public
   - Demo video URL (YouTube/X)
   - Contract address: `0x1012B372bA9b9BdB980a0B8D21973eb791CC7473`
4. **Post X wajib** (lihat draf C) → sertakan di submission.
5. Klik submit sebelum **2026-08-01 21:59 UTC**.

---

## C. Draft Post X (copy-paste, ganti [link] kalau perlu)

> Payroll on-chain tapi gajinya keliatan publik? Itu bukan payroll, itu
> pengumuman gaji. 😅
>
> Kita bikin @iExec Nox buat benerin: **VeilPay** — gaji tiap
> karyawan terenkripsi di TEE, cuma yang berhak yang bisa baca.
> Angka nggak pernah ada di plaintext di chain. 🔐
>
> ✅ Encrypt salary off-chain → handle 32-byte on-chain
> ✅ Employee decrypt miliknya sendiri (gasless, ACL-gated)
> ✅ Claim → reset ke nol terenkripsi
> ✅ Public infra tetap transparan & composable
>
> Live di Sepolia. Built for #WTFHackathon.
> 🔗 GitHub: [link] · Demo: [link]
>
> @iExec

---

## D. Pre-submit verification
- [ ] `git status` → .env tidak ter-track
- [ ] README lengkap (install/run)
- [ ] feedback.md ada
- [ ] dApp jalan di browser (MetaMask Sepolia)
- [ ] video < 4 min, ada suara
- [ ] post X tag @iExec
