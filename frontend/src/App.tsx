import { createContext, useContext, useState } from 'react'
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectCardPage from './pages/ProjectCardPage'
import Presales from './pages/Presales'
import BpmnPage from './pages/BpmnPage'
import C4Page from './pages/C4Page'
import Directories from './pages/Directories'
import Changes from './pages/Changes'

// Ролевая модель (требование «Ролевая модель»): «РП» и «Директор департамента»,
// переключатель в шапке. Роль влияет на стартовый экран и акценты навигации.
export type Role = 'director' | 'pm'
export const RoleContext = createContext<{ role: Role; setRole: (r: Role) => void }>({
  role: 'director',
  setRole: () => {},
})
export const useRole = () => useContext(RoleContext)

export default function App() {
  const [role, setRole] = useState<Role>('director')
  const navigate = useNavigate()

  const switchRole = (r: Role) => {
    setRole(r)
    // Стартовые экраны: директор — портфельный дашборд, РП — карточка проекта (список проектов).
    navigate(r === 'director' ? '/' : '/projects')
  }

  return (
    <RoleContext.Provider value={{ role, setRole: switchRole }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectCardPage />} />
          <Route path="/presales" element={<Presales />} />
          <Route path="/changes" element={<Changes />} />
          <Route path="/bpmn" element={<BpmnPage />} />
          <Route path="/c4" element={<C4Page />} />
          <Route path="/directories" element={<Directories />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </RoleContext.Provider>
  )
}
