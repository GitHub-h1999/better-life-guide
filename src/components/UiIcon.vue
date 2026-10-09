<script setup lang="ts">
defineProps<{ name: string; size?: number }>()
const paths: Record<string, string[]> = {
  book: ['M4 4.5h6a3 3 0 0 1 3 3V21a4 4 0 0 0-4-3H4z', 'M13 7.5a3 3 0 0 1 3-3h5V18h-4a4 4 0 0 0-4 3'],
  grid: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  bookmark: ['M6 4h12v17l-6-4-6 4z'],
  search: ['M21 21l-5-5', 'M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  arrow: ['M4 12h16', 'm14 6 6 6-6 6'],
  external: ['M6 18 18 6', 'M6 6h12v12'],
  down: ['m6 9 6 6 6-6'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  check: ['m5 12 4 4L19 6'],
  clock: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M12 7v5l3 2'],
  sun: ['M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0', 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5'],
  moon: ['M20.5 13.5A9 9 0 0 1 10.5 3.5 9 9 0 1 0 20.5 13.5'],
  settings: ['M4 7h16', 'M4 17h16', 'M9 4v6', 'M15 14v6'],
  share: ['M12 16V3', 'm7 8 5-5 5 5', 'M5 13v7h14v-7'],
}
</script>

<template>
  <svg :width="size || 20" :height="size || 20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path v-for="(path, index) in paths[name] || paths.book" :key="index" :d="path" />
  </svg>
</template>
