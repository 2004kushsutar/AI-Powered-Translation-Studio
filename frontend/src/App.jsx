import { useState } from 'react';
import UploadScreen from './components/UploadScreen';
import LoadingScreen from './components/LoadingScreen';
import DashboardStudio from './components/DashboardStudio';
import TranslationStudio from './components/TranslationStudio';

function App() {
  const [appState, setAppState] = useState('upload'); // 'upload', 'loading', 'dashboard', 'translation'
  const [fileName, setFileName] = useState('');
  const [validationData, setValidationData] = useState(null);

  return (
    <div className="app-container">
      {appState === 'upload' && (
        <UploadScreen 
          onUpload={(name) => {
            setFileName(name);
            setAppState('loading');
          }} 
          setValidationData={setValidationData}
        />
      )}

      {appState === 'loading' && (
        <LoadingScreen 
          fileName={fileName}
          onStart={() => setAppState('dashboard')}
        />
      )}

      {appState === 'dashboard' && (
        <DashboardStudio 
          data={validationData} 
          fileName={fileName} 
          onSwitchMode={(mode) => setAppState(mode)} 
        />
      )}

      {appState === 'translation' && (
        <TranslationStudio 
          fileName={fileName} 
          onSwitchMode={(mode) => setAppState(mode)} 
        />
      )}
    </div>
  );
}

export default App;
