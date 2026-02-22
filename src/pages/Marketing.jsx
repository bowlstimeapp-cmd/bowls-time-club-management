import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  Trophy,
  Table2,
  ShieldCheck,
  ClipboardList,
  BarChart3,
  Bell,
  Settings,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function Marketing() {
  const features = [
    {
      icon: Calendar,
      title: "Smart Rink Booking",
      description: "Members can easily book rinks online with real-time availability. Admins approve or auto-approve bookings instantly.",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/223b294ba_BookaRink.png",
      benefits: ["Real-time availability", "Mobile-friendly", "Conflict prevention"]
    },
    {
      icon: ClipboardList,
      title: "Match Selection Made Easy",
      description: "Selectors can create team sheets, members mark their availability, and everyone gets notified automatically.",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/e2fce74e1_Selection_Pick.png",
      benefits: ["Drag & drop selection", "Availability tracking", "Automatic notifications"]
    },
    {
      icon: BarChart3,
      title: "Live Match Scoring",
      description: "Track scores in real-time during matches. Perfect for county and national competitions.",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/b26c8f920_Selection_liveSCoring.png",
      benefits: ["Real-time updates", "Automatic calculations", "Professional reporting"]
    },
    {
      icon: Table2,
      title: "League Management",
      description: "Run internal leagues with automatic fixture generation, league tables, and player rota management.",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/0f968b5eb_Leagues_MyTeam.png",
      benefits: ["Auto-generate fixtures", "Live league tables", "Player availability"]
    },
    {
      icon: Users,
      title: "Member Management",
      description: "Centralized member database with role management, membership types, and audit logs.",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/38511d569_MemberAdmin.png",
      benefits: ["Role-based access", "Membership groups", "Complete audit trail"]
    },
    {
      icon: ShieldCheck,
      title: "Powerful Admin Tools",
      description: "Comprehensive admin dashboard to manage bookings, members, and club settings all in one place.",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/639bc43c3_Bookings_Admin.png",
      benefits: ["Booking approval system", "Member oversight", "Flexible configuration"]
    },
  ];

  const stats = [
    { label: "Active Clubs", value: "50+", icon: Users },
    { label: "Bookings Managed", value: "10K+", icon: Calendar },
    { label: "Matches Tracked", value: "5K+", icon: Trophy },
    { label: "Members Served", value: "2K+", icon: CheckCircle2 },
  ];

  const benefits = [
    "Save hours of admin time every week",
    "Reduce booking conflicts and confusion",
    "Improve member engagement and communication",
    "Professional team sheets and match reports",
    "Accessible from any device, anywhere",
    "No technical knowledge required"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/61b3b45da_BTZoomed.png"
                alt="BowlsTime"
                className="w-10 h-10 rounded-xl object-cover"
              />
              <span className="font-bold text-xl text-gray-900">BowlsTime</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('ClubSelector')}>
                <Button variant="outline">
                  Member Login
                </Button>
              </Link>
              <a href="#contact">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Get Started
                </Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              <Sparkles className="w-3 h-3 mr-1" />
              Modern Club Management
            </Badge>
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
              The Complete Management Platform for{' '}
              <span className="text-emerald-600">Bowls Clubs</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Streamline your club operations with our all-in-one platform. From rink bookings to match selection and live scoring - everything your club needs in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#features">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 h-14">
                  Explore Features
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
              <a href="#contact">
                <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                  Request a Demo
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20"
          >
            {stats.map((stat, index) => (
              <Card key={index} className="border-emerald-100">
                <CardContent className="p-6 text-center">
                  <stat.icon className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Clubs Choose BowlsTime
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join the clubs already saving time and improving member experience
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-200"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything Your Club Needs
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed specifically for bowls clubs
            </p>
          </div>
          
          <div className="space-y-24">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 lg:gap-12 items-center`}
              >
                <div className="flex-1 space-y-6">
                  <div className="inline-flex p-3 bg-emerald-100 rounded-xl">
                    <feature.icon className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-gray-600 mb-6">
                      {feature.description}
                    </p>
                    <div className="space-y-3">
                      {feature.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span className="text-gray-700">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="rounded-xl shadow-2xl border border-gray-200 w-full"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Transform Your Club?
            </h2>
            <p className="text-xl text-emerald-50 mb-8">
              Join the growing community of clubs using BowlsTime to save time and improve member experience.
            </p>
            <Card className="bg-white p-8 max-w-md mx-auto">
              <CardContent className="space-y-4">
                <div>
                  <p className="text-lg font-medium text-gray-900 mb-4">
                    Get in touch to discuss your club's needs
                  </p>
                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Free consultation and demo</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Custom setup for your club</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Training and support included</span>
                    </div>
                  </div>
                </div>
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-12"
                  onClick={() => window.location.href = 'mailto:contact@bowlstime.com'}
                >
                  Contact Us Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-sm text-gray-500">
                  Or email us at contact@bowlstime.com
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/61b3b45da_BTZoomed.png"
                alt="BowlsTime"
                className="w-10 h-10 rounded-xl object-cover"
              />
              <span className="font-bold text-xl text-white">BowlsTime</span>
            </div>
            <div className="flex gap-6">
              <Link to={createPageUrl('ClubSelector')} className="hover:text-white transition-colors">
                Member Login
              </Link>
              <a href="#features" className="hover:text-white transition-colors">
                Features
              </a>
              <a href="#contact" className="hover:text-white transition-colors">
                Contact
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; 2026 BowlsTime. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}