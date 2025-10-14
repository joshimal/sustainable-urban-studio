import { GISAnalysisApp } from './components/GISAnalysisApp'
import { ClimateProvider } from './contexts/ClimateContext'

export default function App() {
  return (
    <ClimateProvider>
      <GISAnalysisApp />
    </ClimateProvider>
  )
}
