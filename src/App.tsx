import { useEffect } from 'react'
import { useGame } from '@/store/game'
import SoundGate from '@/ui/SoundGate'
import Menu from '@/ui/Menu'
import RaceScreen from '@/ui/RaceScreen'
import Results from '@/ui/Results'
import Pilot from '@/ui/Pilot'
import Garage from '@/ui/Garage'
import About from '@/ui/About'
import Howto from '@/ui/Howto'
import Settings from '@/ui/Settings'
import Share from '@/ui/Share'
import { EvaluationModal, UpdatesModal } from '@/ui/InfoModals'
import { audio } from '@/game/audio'

export default function App() {
  const { screen, modal, setModal, settings, raceId } = useGame()
  // keep audio flags in sync with persisted settings after a reload
  useEffect(() => { audio.setEnabled(settings.sound); audio.setMusic(settings.music) }, [settings.sound, settings.music])
  const close = () => setModal(null)
  return (
    <>
      {screen === 'sound' && <SoundGate />}
      {screen === 'menu' && <Menu />}
      {screen === 'race' && <RaceScreen key={raceId} />}
      {screen === 'results' && <Results />}
      {screen === 'pilot' && <Pilot />}
      {screen === 'garage' && <Garage />}
      {screen === 'about' && <About />}
      {modal === 'howto' && <Howto onClose={close} />}
      {modal === 'settings' && <Settings onClose={close} />}
      {modal === 'evaluation' && <EvaluationModal onClose={close} />}
      {modal === 'updates' && <UpdatesModal onClose={close} />}
      {modal === 'share' && <Share onClose={close} />}
    </>
  )
}
