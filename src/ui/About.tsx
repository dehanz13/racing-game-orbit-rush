import { Header, Footer } from './Chrome'
import { LEX } from '@/config/game'

export default function About() {
  return (
    <div className="view">
      <Header />
      <div className="about">
        <h1>About {LEX.game}</h1>
        <p>{LEX.game} is an arcade drive-and-collect game that runs entirely in the browser. Steer a tiny rig across an endless neon grid, hoover up Sparks, light the 24 Beacons, outgun Drones and Titans, and push your Pulse Score as high as it will go before your Hull gives out or the clock runs down.</p>
        <h3 className="display" style={{ fontSize: 16, marginTop: 28 }}>How a run is scored</h3>
        <ul>
          <li>Sparks are the heart of the score. Gold Sparks are worth ten.</li>
          <li>Beacons add a permanent multiplier; later Beacons add more.</li>
          <li>Comet Cores, Supply Crates and multiplier shards boost the multiplier temporarily.</li>
          <li>Four weighted performance factors (Velocity 40%, Control 30%, Flair 20%, Reach 10%) add a final bonus.</li>
        </ul>
        <h3 className="display" style={{ fontSize: 16, marginTop: 28 }}>Built with</h3>
        <div className="tech">{['React', 'React Three Fiber', 'Three.js', 'postprocessing', 'Zustand', 'Vite', 'TypeScript', 'Web Audio'].map(t => <span key={t}>{t}</span>)}</div>
        <p style={{ marginTop: 28 }}>All models are procedural geometry, all sounds are synthesized at runtime, and all progress is stored in your browser. No analytics, no accounts.</p>
      </div>
      <Footer />
    </div>
  )
}
