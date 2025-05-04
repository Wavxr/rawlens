import { PDFDocument, rgb } from 'pdf-lib'
import download from 'downloadjs'

export async function generateAgreementPdf(formData, signatureDataUrl) {
  const existingPdfBytes = await fetch('/RawLens Camera Agreement.pdf').then(res => res.arrayBuffer())
  const pdfDoc = await PDFDocument.load(existingPdfBytes)

  const signatureImageBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer())
  const signatureImage = await pdfDoc.embedPng(signatureImageBytes)

  const pages = pdfDoc.getPages()
  const page1 = pages[0]  // Page 1
  const page3 = pages[2]  // Page 3

  const { device, name, dateBorrow, dateReturn } = formData

  // === Fill Page 1 ===
  page1.drawText(name, { x: 95, y: 665, size: 12, color: rgb(0, 0, 0) }) 

  // === Fill Page 3 ===
  page3.drawText(device, { x: 430, y: 360, size: 12, color: rgb(0, 0, 0) })
  page3.drawText(dateBorrow, { x: 400, y: 435, size: 12, color: rgb(0, 0, 0) })
  page3.drawText(dateReturn, { x: 470, y: 435, size: 12, color: rgb(0, 0, 0) })

  // Signature (image)
  page3.drawImage(signatureImage, {
    x: 140,
    y: 430,
    width: 200,
    height: 50,
  })

  // Name below signature
  page3.drawText(name, {
    x: 150,
    y: 435,
    size: 12,
    color: rgb(0, 0, 0)
  })

  const pdfBytes = await pdfDoc.save()
  download(pdfBytes, 'RawLens_Agreement_Filled.pdf', 'application/pdf')

  // Success message + Instagram redirect
  if (confirm('Success! Your agreement is ready.\nPlease send it to @rawlensph on Instagram.\n\nClick OK to open Instagram.')) {
  window.open('https://www.instagram.com/rawlensph/', '_blank')

}

}
