import { useState, useEffect } from "react"
import { getPublicCameras, getPublicCameraNames } from "@services/publicService"
import LoadingScreen from "@components/shared/auth/LoadingScreen"
import Header from "@components/user/landing/Header"
import Hero from "@components/user/landing/Hero"
import Features from "@components/user/landing/Features"
import CameraCollection from "@components/user/landing/CameraCollection"
import Process from "@components/user/landing/Process"
import InquiryForm from "@components/user/landing/InquiryForm"
import CTA from "@components/user/landing/CTA"
import FollowUs from "@components/user/landing/FollowUs"
import Footer from "@components/user/landing/Footer"

export default function Landing() {
  const [publicCameras, setPublicCameras] = useState([])
  const [cameraNames, setCameraNames] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCameraData = async () => {
      const [camerasResult, namesResult] = await Promise.all([
        getPublicCameras({ limit: 24 }),
        getPublicCameraNames(),
      ])

      if (!camerasResult.error) setPublicCameras(camerasResult.data) 
      if (!namesResult.error) setCameraNames(namesResult.data)

      setIsLoading(false)
    }

    fetchCameraData()
  }, [])

  if (isLoading) { return <LoadingScreen /> }

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased">
      <Header />
      <Hero />
      <Features />
      <CameraCollection cameras={publicCameras} />
      <Process />
      <InquiryForm cameraNames={cameraNames} cameras={publicCameras} />
      <CTA />
      <FollowUs />
      <Footer />
    </div>
  )
}