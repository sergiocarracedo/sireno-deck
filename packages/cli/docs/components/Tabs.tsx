import React, { useState, createContext, useContext } from "react"

interface TabsContextValue {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

interface TabsProps {
  children: React.ReactNode
  defaultTab: string
}

export function Tabs({ children, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="my-4">{children}</div>
    </TabsContext.Provider>
  )
}

interface TabListProps {
  children: React.ReactNode
}

export function TabList({ children }: TabListProps) {
  return <div className="flex border-b border-gray-700 mb-4">{children}</div>
}

interface TabProps {
  value: string
  children: React.ReactNode
}

export function Tab({ value, children }: TabProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error("Tab must be used within Tabs")

  const { activeTab, setActiveTab } = context
  const isActive = activeTab === value

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "text-blue-400 border-b-2 border-blue-400 -mb-px"
          : "text-gray-400 hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  )
}

interface TabPanelProps {
  value: string
  children: React.ReactNode
}

export function TabPanel({ value, children }: TabPanelProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error("TabPanel must be used within Tabs")

  const { activeTab } = context

  if (activeTab !== value) return null

  return <div>{children}</div>
}
