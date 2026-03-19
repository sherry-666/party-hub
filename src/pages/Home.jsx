import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const GameCard = ({ title, description, icon, path, comingSoon = false }) => {
  const navigate = useNavigate();
  
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
        <span className="badge badge-soon">敬请期待</span>
      ) : (
        <button className="btn btn-primary">立即开始</button>
      )}
    </motion.div>
  );
};

const Home = () => {
  return (
    <div className="home-container">
      <header className="hero-section animate-fade-in">
        <h1 className="hero-title">聚会 <span>中心</span></h1>
        <p className="hero-subtitle">数字聚会游戏的终极目的地。</p>
      </header>
      
      <main className="game-grid container">
        <GameCard 
          title="谁是卧底"
          description="在经典的推理与欺骗游戏中揭开潜伏在你们中间的卧底。"
          icon="🕵️‍♂️"
          path="/spy"
        />
        <GameCard 
          title="卧底 (Undercover)"
          description="节奏快速的词项关联游戏，适合多人聚会。"
          icon="🕶️"
          path="/undercover"
          comingSoon={true}
        />
        <GameCard 
          title="你画我猜"
          description="展示你的创意并猜出别人的绘画内容。"
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
