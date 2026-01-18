import { useNavigate } from 'react-router-dom'
import { HeroSection } from '../components/ui/dynamic-hero'
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  UserGroupIcon,
  ChartBarIcon,
  CheckCircleIcon,
  SparklesIcon,
  BoltIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

export function Home() {
  const navigate = useNavigate()

  const features = [
    {
      icon: CalendarDaysIcon,
      title: 'Smart Scheduling',
      description: 'AI-powered time slot suggestions and conflict resolution for seamless booking.'
    },
    {
      icon: UserGroupIcon,
      title: 'Event Management',
      description: 'Create, manage, and track events with registration capabilities.'
    },
    {
      icon: ClockIcon,
      title: 'Calendar Sync',
      description: 'Two-way synchronization with Google Calendar and other providers.'
    },
    {
      icon: ChartBarIcon,
      title: 'Analytics',
      description: 'Track bookings, attendance, and engagement with detailed insights.'
    }
  ]

  const useCases = [
    {
      icon: UserGroupIcon,
      title: 'For Educators & Mentors',
      description: 'Schedule office hours, one-on-one sessions, and group workshops with students seamlessly.',
      benefits: ['Automated booking slots', 'Student waitlists', 'Session notes & feedback']
    },
    {
      icon: BoltIcon,
      title: 'For Event Organizers',
      description: 'Host hackathons, workshops, webinars, and conferences with built-in registration and tracking.',
      benefits: ['Custom registration forms', 'Attendee management', 'QR-code check-in']
    },
    {
      icon: GlobeAltIcon,
      title: 'For Businesses',
      description: 'Streamline client consultations, interviews, and team meetings with professional booking pages.',
      benefits: ['Team scheduling', 'Multiple time zones', 'Payment integration ready']
    }
  ]

  const whyChoose = [
    'Open-source and fully customizable',
    'No hidden fees or subscription tiers',
    'Self-host or use our cloud platform',
    'Privacy-focused with complete data control',
    'Active community and continuous updates',
    'Built with modern tech stack (React, TypeScript, Supabase)'
  ]

  const handleGetStarted = () => {
    navigate('/signup')
  }

  return (
    <div className="bg-white">
      {/* Dynamic Hero Section */}
      <HeroSection
        heading="Smart Scheduling Made Simple"
        tagline="The open-source platform that combines the best of Calendly, Eventbrite, and hackathon tools into one powerful scheduling solution."
        buttonText="Get Started Free"
        imageUrl="/demo.png"
        onButtonClick={handleGetStarted}
      />

      {/* Features Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to manage schedules
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From simple appointments to complex events, Schedlyx handles it all 
              with intelligent automation and seamless integrations.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-lg mb-4">
                  <feature.icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built for Everyone
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you're an educator, event organizer, or business professional, 
              Schedlyx adapts to your unique scheduling needs.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-8 hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4">
                  <useCase.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {useCase.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {useCase.description}
                </p>
                <ul className="space-y-2">
                  {useCase.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Choose Schedlyx Section */}
      <div className="py-24 bg-gradient-to-br from-primary-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Schedlyx?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              More than just another scheduling tool. Schedlyx is built with your 
              freedom, privacy, and control in mind.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {whyChoose.map((reason, index) => (
              <div key={index} className="flex items-start bg-white rounded-lg p-6 shadow-sm">
                <CheckCircleIcon className="w-6 h-6 text-primary-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 font-medium">{reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Setting up your first event or booking page is incredibly simple
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Create Your Account
              </h3>
              <p className="text-gray-600">
                Sign up for free in seconds. No credit card required.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Set Your Availability
              </h3>
              <p className="text-gray-600">
                Define your working hours, time zones, and booking preferences.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Share Your Link
              </h3>
              <p className="text-gray-600">
                Get your personalized booking page and start accepting appointments.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">100%</div>
              <div className="text-gray-400">Open Source</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">0</div>
              <div className="text-gray-400">Hidden Fees</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">24/7</div>
              <div className="text-gray-400">Availability</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">∞</div>
              <div className="text-gray-400">Possibilities</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to streamline your scheduling?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of users who trust Schedlyx for their scheduling needs.
          </p>
        </div>
      </div>
    </div>
  )
}