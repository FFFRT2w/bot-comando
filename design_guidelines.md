# Design Guidelines: Bot Central Monitor Dashboard

## Design Approach
**System-Based Approach**: Inspired by modern developer dashboard platforms (Vercel, Railway, Render) with Carbon Design System principles for data-heavy, monitoring-focused applications.

**Core Principles**:
- Clarity and scanability for quick status assessment
- Information hierarchy prioritizing critical data (status, uptime)
- Functional efficiency over decorative elements
- Real-time data visibility

## Typography

**Font Stack**: 
- Primary: Inter (Google Fonts) - clean, readable for data
- Monospace: JetBrains Mono - for URLs, IDs, technical data

**Hierarchy**:
- Page Titles: text-2xl font-semibold
- Section Headers: text-lg font-medium
- Body/Labels: text-sm font-normal
- Data/Metrics: text-base font-medium
- Technical Data (URLs, IDs): text-sm font-mono

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Tight spacing: p-2, gap-2 (within components)
- Standard spacing: p-4, gap-4 (between elements)
- Section spacing: p-6 (cards, forms)
- Page spacing: p-8 (main containers)

**Grid Structure**:
- Sidebar navigation: 240px fixed width
- Main content: flex-1 with max-w-7xl container
- Responsive: Sidebar collapses to hamburger on mobile

## Component Library

### Navigation
**Sidebar**: Fixed left navigation with logo at top, main nav items (Dashboard, Bots, Logs, Settings), collapse toggle for mobile

### Dashboard Components

**Status Cards Grid**:
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Each card displays: Bot name, status badge, last ping time, response time
- Hover state: Subtle elevation increase
- Click action: Expands to show details or navigates to bot details

**Status Indicators**:
- Online: Solid circle indicator with "Online" label
- Offline: Solid circle indicator with "Offline" label  
- Checking: Animated pulse circle with "Checking..." label
- Position: Always leading (left) of bot name

**Bot List Table** (alternative/additional view):
- Columns: Status, Bot Name, URL, Guild ID, Last Ping, Response Time, Actions
- Row hover: Background highlight
- Sortable columns
- Action buttons: Edit (pencil icon), Delete (trash icon)

### Forms

**Add/Edit Bot Form**:
- Input fields: Bot Name (required), HTTP URL (required), Guild ID (optional), Client ID (optional), Notes (textarea, optional)
- Each field: Label above, input below with border, focus ring on interaction
- Submit button: Primary action, full width on mobile, auto-width on desktop
- Cancel button: Secondary action, positioned left of submit

**Form Layout**:
- Single column: max-w-2xl centered
- Field spacing: space-y-4
- Label-input gap: gap-1

### Data Display

**Metrics Overview** (top of dashboard):
- Horizontal row: Total Bots, Online Bots, Offline Bots, Average Response Time
- Card-based: Each metric in bordered container
- Large numbers: text-3xl font-bold
- Labels below: text-sm text-muted

**Activity Log**:
- Chronological list with timestamps (font-mono)
- Entry types: Ping success, Ping failure, Bot added, Bot removed
- Icon indicators for each entry type
- Max height with scroll: max-h-96 overflow-y-auto

### Interactive Elements

**Empty States**:
- No bots configured: Centered illustration or icon, heading "No bots configured", description, prominent "Add Your First Bot" button
- No recent activity: Simple message with supporting text

**Loading States**:
- Skeleton loaders for cards while fetching data
- Spinner for form submissions

## Icons
Use **Heroicons** (outline style) via CDN:
- Status: CheckCircle, XCircle, ArrowPath (spinning)
- Actions: Pencil, Trash, Plus, Cog
- Navigation: ChartBar, Server, ClipboardList, Cog

## Animations
Minimal, purposeful animations only:
- Status indicator pulse (for "checking" state)
- Smooth transitions on hover states (transition-all duration-200)
- Page transitions: None (instant for data clarity)

## Accessibility
- All status indicators include text labels, not just colors
- Form inputs have associated labels with htmlFor
- Keyboard navigation for all interactive elements
- Focus visible states on all clickable elements
- ARIA labels for icon-only buttons

## Layout Specifications

**Dashboard Page**:
- Metrics cards at top (4-column grid on desktop)
- Main content: Tabs or segmented control switching between Grid View and Table View
- Grid View: Responsive card grid of all bots
- Table View: Full-width data table

**Add/Edit Bot Page**:
- Centered form container
- Breadcrumb navigation at top
- Form fields in logical order
- Action buttons at bottom right (Cancel, Save)

**Responsive Behavior**:
- Desktop (lg): Sidebar visible, multi-column grids
- Tablet (md): Sidebar collapsible, 2-column grids
- Mobile (base): Hamburger menu, single column, stacked layout

This dashboard prioritizes functionality and data clarity - perfect for monitoring multiple bots at a glance while providing detailed management capabilities.