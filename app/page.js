'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ToastContainer, toast } from 'react-toastify'
import { X } from 'lucide-react'
import 'react-toastify/dist/ReactToastify.css'
import 'tailwindcss/tailwind.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import Image from 'next/image'

export default function Home() {
  const [name, setName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [language, setLanguage] = useState('ar')
  const router = useRouter()

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language')
    if (savedLanguage) {
      setLanguage(savedLanguage)
    }

    // Clear all localStorage items except 'language'
    Object.keys(localStorage).forEach((key) => {
      if (key !== 'language') {
        localStorage.removeItem(key)
      }
    })
  }, [])

  const toggleLanguage = () => {
    const newLanguage = language === 'ar' ? 'en' : 'ar'
    setLanguage(newLanguage)
    localStorage.setItem('language', newLanguage)
  }

  const phoneNumberRegex = /^07[7-9][0-9]{7}$/
  const idNumberRegex = /^[0-9]{10}$/

  const validateInputs = () => {
    if (
      name.trim() === '' ||
      idNumber.trim() === '' ||
      phoneNumber.trim() === ''
    ) {
      toast.error(
        language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill in all fields'
      )
      return false
    }
    if (!phoneNumberRegex.test(phoneNumber)) {
      toast.error(
        language === 'ar'
          ? 'رقم هاتف غير صالح. يجب أن يكون رقمًا مكونًا من 10 أرقام يبدأ بـ 07'
          : 'Invalid phone number. It should be a 10-digit number starting with 07'
      )
      return false
    }
    if (!idNumberRegex.test(idNumber)) {
      toast.error(
        language === 'ar'
          ? 'رقم هوية غير صالح. يجب أن يكون مكونًا من 10 أرقام بالضبط'
          : 'Invalid ID number. It should be exactly 10 digits'
      )
      return false
    }
    return true
  }

  const handleClick = async () => {
    try {
      setIsLoading(true)
      if (!validateInputs()) return

      localStorage.setItem('userName', name)
      localStorage.setItem('userId', idNumber)
      localStorage.setItem('phoneNumber', phoneNumber)

      router.push('/exam')
    } catch (error) {
      console.error('Error logging in:', error.message)
      toast.error(
        language === 'ar'
          ? `خطأ في تسجيل الدخول: ${error.message}`
          : `Login error: ${error.message}`
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdminSubmit = () => {
    if (!adminEmail || !name) {
      toast.error(
        language === 'ar'
          ? 'يرجى إدخال البريد الإلكتروني واسمك'
          : 'Please enter your email and name'
      )
      return
    }

    localStorage.setItem('adminEmail', adminEmail)
    toast.success(
      language === 'ar'
        ? 'تم تسجيل دخول المسؤول بنجاح'
        : 'Admin login successful'
    )
    router.push('/admin')
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-r from-green-50 to-blue-50 flex items-center justify-center relative p-4 ${
        language === 'ar' ? 'rtl' : 'ltr'
      }`}
    >
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <Label htmlFor="language-toggle">
          {language === 'ar' ? 'العربية' : 'English'}
        </Label>
        <Switch
          id="language-toggle"
          checked={language === 'ar'}
          onCheckedChange={toggleLanguage}
        />
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button className="absolute top-4 left-4 bg-green-500 hover:bg-green-600 text-white">
            {language === 'ar' ? 'تسجيل دخول المسؤول' : 'Admin Login'}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader className="flex items-center">
            <DialogTitle>
              {language === 'ar' ? 'تسجيل دخول المسؤول' : 'Admin Login'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder={
                language === 'ar'
                  ? 'أدخل البريد الإلكتروني للمسؤول'
                  : 'Enter admin email'
              }
              className={language === 'ar' ? 'text-right' : 'text-left'}
            />
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'ar' ? 'أدخل اسمك' : 'Enter your name'}
              className={language === 'ar' ? 'text-right' : 'text-left'}
            />
          </div>
          <DialogFooter className="w-full flex">
            <div className={language === 'ar' ? 'ml-auto' : 'mr-auto'}>
              <Button
                onClick={handleAdminSubmit}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8 border-t-4 border-green-600">
        <div className="flex justify-center mb-6">
          <Image
            src="/JEA2.png"
            alt={
              language === 'ar'
                ? 'شعار نقابة المهندسين الأردنيين'
                : 'Jordan Engineers Association Logo'
            }
            width={80}
            height={80}
            layout="fixed"
          />
        </div>
        <h1 className="text-3xl font-bold text-center text-green-800 mb-6">
          {language === 'ar' ? 'تسجيل الدخول للاختبار' : 'Exam Login'}
        </h1>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={language === 'ar' ? 'أدخل اسمك' : 'Enter your name'}
          className={`mb-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}
        />
        <Input
          type="text"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          placeholder={
            language === 'ar' ? 'أدخل رقم الهوية' : 'Enter ID number'
          }
          className={`mb-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}
          maxLength="10"
        />
        <Input
          type="text"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder={
            language === 'ar' ? 'أدخل رقم الهاتف' : 'Enter phone number'
          }
          className={`mb-6 ${language === 'ar' ? 'text-right' : 'text-left'}`}
          maxLength="10"
        />
        <Button
          onClick={handleClick}
          className="w-full bg-green-500 hover:bg-green-600 text-white"
          disabled={isLoading}
        >
          {isLoading
            ? language === 'ar'
              ? 'جاري التحميل...'
              : 'Loading...'
            : language === 'ar'
            ? 'بدء الاختبار'
            : 'Start Exam'}
        </Button>
        <ToastContainer rtl={language === 'ar'} position="top-right" />
      </div>
    </div>
  )
}
