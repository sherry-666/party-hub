import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from '../contexts/LanguageContext';

const GameCard = ({ title, description, icon, path, comingSoon = false }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <motion.div
      className="game-card glass-card"
      whileHover={{ scale: 1.05, translateY: -10 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => !comingSoon && navigate(path)}
      style={{ cursor: comingSoon ? 'default' : 'pointer' }}
    >
      <div className="card-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {comingSoon ? (
        <span className="badge badge-soon">{t('home.comingSoon')}</span>
      ) : (
        <button className="btn btn-primary">{t('home.startNow')}</button>
      )}
    </motion.div>
  );
};

const Home = () => {
  const { t } = useTranslation();
  return (
    <div className="home-container">
      <header className="hero-section animate-fade-in">
        <h1 className="hero-title">{t('home.title1')} <span>{t('home.title2')}</span></h1>
        <p className="hero-subtitle">{t('home.subtitle')}</p>
      </header>

      <main className="game-grid container">
        <GameCard
          title={t('home.spyTitle')}
          description={t('home.spyDesc')}
          icon="🕵️‍♂️"
          path="/spy"
        />
        <GameCard
          title={t('home.musicSpyTitle')}
          description={t('home.musicSpyDesc')}
          icon="🎵"
          path="/spy-music"
        />
        <GameCard
          title={t('home.drawTitle')}
          description={t('home.drawDesc')}
          icon="🎨"
          path="/draw"
          comingSoon={true}
        />
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .home-container {
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 60px;
        }
        
        .hero-section {
          text-align: center;
          max-width: 800px;
        }
        
        .hero-title {
          font-size: 5rem;
          font-weight: 800;
          margin-bottom: 10px;
          line-height: 1.1;
          letter-spacing: -2px;
        }
        
        .hero-title span {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .hero-subtitle {
          font-size: 1.5rem;
          color: var(--text-muted);
          font-weight: 400;
        }
        
        .container {
          width: 100%;
          max-width: 1100px;
        }
        
        .game-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
        }
        
        .game-card {
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 20px;
          position: relative;
          overflow: hidden;
        }
        
        .card-icon {
          font-size: 4rem;
          background: rgba(255, 255, 255, 0.05);
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          margin-bottom: 10px;
        }
        
        .game-card h3 {
          font-size: 1.8rem;
          font-weight: 700;
        }
        
        .game-card p {
          color: var(--text-muted);
          line-height: 1.6;
        }
        
        .badge {
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .badge-soon {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-muted);
        }
        
        @media (max-width: 768px) {
          .hero-title { font-size: 3.5rem; }
        }
      `}} />
    </div>
  );
}

export default Home;
