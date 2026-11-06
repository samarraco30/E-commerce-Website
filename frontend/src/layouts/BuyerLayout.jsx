
import { useState } from 'react'
import BuyerNavbar from '../components/buyer/BuyerNavbar'
import '../styles/buyer/buyer-layout.css'

const currentYear = new Date().getFullYear()

export default function BuyerLayout({ children }) {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="buyer-layout">
      <BuyerNavbar onSearch={setSearchTerm} />

      <main className="buyer-main-content">
        {typeof children === 'function'
          ? children(searchTerm)
          : children}
      </main>

      <footer className="buyer-footer">
        <div className="buyer-footer-inner">
          <div>
            <strong>ALT F4</strong>
            <p>Discover Local. Support Local. Shop Local.</p>
          </div>

          <span>
            © {currentYear} ALT F4. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
    )
}
