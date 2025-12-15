"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PipelineView, DealList } from "@/components/deals"

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState("pipeline")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="pipeline" className="touch-manipulation">Pipeline</TabsTrigger>
            <TabsTrigger value="list" className="touch-manipulation">List View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pipeline" className="space-y-6">
            <PipelineView />
          </TabsContent>
          
          <TabsContent value="list" className="space-y-6">
            <DealList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}