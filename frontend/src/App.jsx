import { Routes, Route } from 'react-router-dom';
import Home from './components/kid/Home.jsx';
import PinGate from './components/parent/PinGate.jsx';
import ParentShell from './components/parent/ParentShell.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/parent"
        element={
          <PinGate>
            <ParentShell />
          </PinGate>
        }
      />
    </Routes>
  );
}
