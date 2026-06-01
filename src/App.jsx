import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SpyGameTemplate from './pages/SpyGameTemplate';
import MusicSpyGame from './pages/MusicSpyGame';
import LanguageToggle from './components/LanguageToggle';

function App() {
  return (
    <Router>
      <div className="app-container">
        <LanguageToggle />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/spy" element={<SpyGameTemplate />} />
          <Route path="/spy-music" element={<MusicSpyGame />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
