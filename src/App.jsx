import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SpyGameTemplate from './pages/SpyGameTemplate';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/spy" element={<SpyGameTemplate />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
