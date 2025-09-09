import React from 'react'
import Login from './views/Login.jsx'
import Uploader from './views/Uploader.jsx'


export default function App() {
const [isLoggedIn, setIsLoggedIn] = React.useState(false)


return (
<div>
{isLoggedIn ? (
<Uploader onLogout={() => setIsLoggedIn(false)} />
) : (
<Login onLogin={() => setIsLoggedIn(true)} />
)}
</div>
)
}