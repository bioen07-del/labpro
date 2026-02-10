"use client"

import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Position with equipment join from getPositions()
// Uses permissive types to accept various local Position types across forms
interface PositionBase {
  id: string
  path: string
  parent_id?: string | null
  is_active?: boolean
  equipment_id?: string | null
  equipment?: {
    id?: string
    name?: string
    type?: string
  } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Position = PositionBase & Record<string, any>

interface PositionTreeSelectProps {
  positions: Position[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  /** Filter by equipment type, e.g. 'INCUBATOR' */
  equipmentTypeFilter?: string
  /** Only show leaf positions (no children) */
  leafOnly?: boolean
  /** Custom trigger className */
  triggerClassName?: string
  /** Size */
  size?: 'sm' | 'default'
}

/**
 * Hierarchical position selector grouped by equipment.
 * Displays: Equipment Name → Position → Child position (indented)
 *
 * Replaces flat position selects across all forms.
 */
export function PositionTreeSelect({
  positions,
  value,
  onValueChange,
  placeholder = 'Выберите позицию...',
  equipmentTypeFilter,
  leafOnly = false,
  triggerClassName,
  size,
}: PositionTreeSelectProps) {
  const tree = useMemo(() => {
    // Filter active positions
    let filtered = positions.filter((p) => p.is_active !== false)

    // Filter by equipment type if specified
    if (equipmentTypeFilter) {
      filtered = filtered.filter(
        (p) => !p.equipment || p.equipment.type === equipmentTypeFilter
      )
    }

    // Group by equipment
    const equipmentMap = new Map<string, { name: string; positions: Position[] }>()
    const noEquipment: Position[] = []

    for (const pos of filtered) {
      if (pos.equipment_id && pos.equipment) {
        const key = pos.equipment_id
        if (!equipmentMap.has(key)) {
          equipmentMap.set(key, { name: pos.equipment.name || 'Без названия', positions: [] })
        }
        equipmentMap.get(key)!.positions.push(pos)
      } else {
        noEquipment.push(pos)
      }
    }

    // For each equipment group, build parent→children tree
    const groups: {
      equipmentName: string
      items: { position: Position; children: Position[] }[]
    }[] = []

    for (const [, group] of equipmentMap) {
      const topLevel = group.positions.filter((p) => !p.parent_id)
      const getChildren = (parentId: string) =>
        group.positions.filter((p) => p.parent_id === parentId)

      const items: { position: Position; children: Position[] }[] = []

      for (const parent of topLevel) {
        const children = getChildren(parent.id)
        items.push({ position: parent, children })
      }

      // Also include positions with parent_id that point to parent not in this list (orphans)
      const allAccountedIds = new Set(
        items.flatMap((i) => [i.position.id, ...i.children.map((c) => c.id)])
      )
      const orphans = group.positions.filter((p) => !allAccountedIds.has(p.id))
      for (const o of orphans) {
        items.push({ position: o, children: [] })
      }

      groups.push({ equipmentName: group.name, items })
    }

    // No-equipment group
    let noEquipItems: { position: Position; children: Position[] }[] = []
    if (noEquipment.length > 0) {
      const topLevel = noEquipment.filter((p) => !p.parent_id)
      const getChildren = (parentId: string) =>
        noEquipment.filter((p) => p.parent_id === parentId)

      for (const parent of topLevel) {
        const children = getChildren(parent.id)
        noEquipItems.push({ position: parent, children })
      }
      const allAccountedIds = new Set(
        noEquipItems.flatMap((i) => [i.position.id, ...i.children.map((c) => c.id)])
      )
      const orphans = noEquipment.filter((p) => !allAccountedIds.has(p.id))
      for (const o of orphans) {
        noEquipItems.push({ position: o, children: [] })
      }
    }

    return { groups, noEquipItems }
  }, [positions, equipmentTypeFilter])

  // Build display label for selected value
  const selectedLabel = useMemo(() => {
    if (!value) return undefined
    const pos = positions.find((p) => p.id === value)
    if (!pos) return undefined

    const parts: string[] = []
    if (pos.equipment?.name) parts.push(pos.equipment.name)

    // If this position has a parent, show parent path
    if (pos.parent_id) {
      const parent = positions.find((p) => p.id === pos.parent_id)
      if (parent) parts.push(parent.path)
    }

    parts.push(pos.path)
    return parts.join(' / ')
  }, [value, positions])

  // Helper to determine if position is selectable
  const isSelectable = (pos: Position, hasChildren: boolean) => {
    if (!leafOnly) return true
    return !hasChildren
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName} size={size}>
        <SelectValue placeholder={placeholder}>
          {selectedLabel}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {tree.groups.map((group, gi) => (
          <SelectGroup key={gi}>
            <SelectLabel className="font-semibold text-xs uppercase tracking-wide text-primary">
              {group.equipmentName}
            </SelectLabel>
            {group.items.map((item) => {
              const hasChildren = item.children.length > 0
              return (
                <div key={item.position.id}>
                  {/* Parent position */}
                  {isSelectable(item.position, hasChildren) ? (
                    <SelectItem value={item.position.id} className="pl-4">
                      {item.position.path}
                    </SelectItem>
                  ) : (
                    <div className="px-4 py-1 text-xs text-muted-foreground">
                      {item.position.path}
                    </div>
                  )}
                  {/* Children */}
                  {item.children.map((child) => (
                    <SelectItem key={child.id} value={child.id} className="pl-8">
                      <span className="text-muted-foreground mr-1">└</span>
                      {child.path}
                    </SelectItem>
                  ))}
                </div>
              )
            })}
            {gi < tree.groups.length - 1 && <SelectSeparator />}
          </SelectGroup>
        ))}

        {tree.noEquipItems.length > 0 && (
          <>
            {tree.groups.length > 0 && <SelectSeparator />}
            <SelectGroup>
              <SelectLabel className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Без оборудования
              </SelectLabel>
              {tree.noEquipItems.map((item) => {
                const hasChildren = item.children.length > 0
                return (
                  <div key={item.position.id}>
                    {isSelectable(item.position, hasChildren) ? (
                      <SelectItem value={item.position.id} className="pl-4">
                        {item.position.path}
                      </SelectItem>
                    ) : (
                      <div className="px-4 py-1 text-xs text-muted-foreground">
                        {item.position.path}
                      </div>
                    )}
                    {item.children.map((child) => (
                      <SelectItem key={child.id} value={child.id} className="pl-8">
                        <span className="text-muted-foreground mr-1">└</span>
                        {child.path}
                      </SelectItem>
                    ))}
                  </div>
                )
              })}
            </SelectGroup>
          </>
        )}

        {tree.groups.length === 0 && tree.noEquipItems.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Нет доступных позиций
          </div>
        )}
      </SelectContent>
    </Select>
  )
}
