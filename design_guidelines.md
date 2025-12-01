# School Online Voting System - Design Guidelines

## Design Approach

**Selected Approach:** Design System - Material Design Principles
**Justification:** This is a utility-focused institutional application requiring clarity, trust, and efficiency. Material Design provides proven patterns for forms, data tables, and dashboard layouts essential for voting systems.

**Reference Inspiration:** Modern admin interfaces like Linear and Vercel Dashboard for clean data presentation, combined with educational platforms like Google Classroom for accessibility.

## Core Design Principles

1. **Institutional Trust:** Professional, clean layouts that instill confidence in the voting process
2. **Role Clarity:** Distinct visual separation between Admin and Student portals
3. **Information Hierarchy:** Clear priority of election status, deadlines, and voting options
4. **Accessibility First:** High contrast, clear labels, large touch targets for school environment

## Typography System

**Primary Font:** Inter or Roboto (via Google Fonts CDN)
**Secondary Font:** System font stack for optimal performance

**Hierarchy:**
- Page Titles: text-3xl font-bold (Admin) / text-2xl font-semibold (Student)
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Helper Text: text-sm text-gray-600
- Labels: text-sm font-medium uppercase tracking-wide

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8
- Component padding: p-4 to p-6
- Section margins: mb-6 to mb-8
- Card gaps: gap-4 to gap-6
- Form field spacing: space-y-4

**Grid System:**
- Admin Dashboard: 3-column metrics grid (grid-cols-1 md:grid-cols-3)
- Elections List: 2-column layout (grid-cols-1 lg:grid-cols-2)
- Candidate Cards: 2-3 columns (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Forms: Single column with max-w-md centering

**Container Structure:**
- Max width: max-w-7xl mx-auto
- Page padding: px-4 md:px-6 lg:px-8
- Content sections: py-6 to py-8

## Component Library

### Navigation
**Admin Sidebar:** Fixed left sidebar (w-64) with icon + text navigation
**Student Sidebar:** Similar structure, different menu items
- Active state: subtle background fill
- Hover state: light background
- Icons from Heroicons (outline style)

### Dashboard Cards
- Metric Cards: Elevated cards with large numbers, labels, and icons
- Election Cards: Horizontal layout with status badge, title, date range, candidate count
- Status Badges: Rounded pills (rounded-full px-3 py-1 text-xs font-medium)

### Forms
**Login Pages:**
- Centered card layout (max-w-md mx-auto)
- Logo/title at top
- Role toggle tabs (Admin/Student)
- Stacked form fields with clear labels above inputs
- Full-width primary button
- Helper links below (Forgot Password, Sign Up)

**Form Inputs:**
- Height: h-11 for all inputs
- Padding: px-4
- Border: border rounded-lg
- Focus: ring-2 ring-offset-2
- Labels: mb-2 block

### Data Tables (Admin)
- Striped rows for readability
- Sticky header row
- Action buttons in right column
- Responsive: scroll horizontally on mobile
- Pagination at bottom

### Candidate Display
**Voting Interface:**
- Card layout with placeholder image (aspect-square or aspect-[3/4])
- Candidate name: text-lg font-semibold
- Description: text-sm line-clamp-3
- Radio button or Vote button
- Post label at top (President, Captain, etc.)

### Buttons
- Primary: Full background, font-medium, px-6 py-3, rounded-lg
- Secondary: Border style, same sizing
- Danger: For delete/block actions
- Icon Buttons: Square, p-2, for table actions
- Disabled state: Reduced opacity

### Alerts & Notifications
- Success banner: After successful vote
- Warning banner: Election timing notifications
- Error messages: Near form fields
- Toast notifications: Fixed top-right for real-time updates

### Election Status Indicators
- Visual timeline showing: Upcoming → Live → Completed
- Countdown timer for live elections
- Clear "Voting Closed" state
- "Results Published" indicator

## Page-Specific Layouts

### Admin Dashboard
- Top metrics row (3 cards: Total Students, Active Elections, Total Votes)
- Recent elections table
- Quick actions section

### Student Dashboard
- Welcome header with student name
- Election status cards (Upcoming, Live, Past)
- Recent activity feed
- Profile summary card

### Vote Casting Page
- Election title and description header
- Post sections (grouped by position)
- Candidate cards within each post
- Fixed bottom action bar with "Submit Vote" button
- Confirmation modal before submission

### Results Pages
- Tabbed interface for multiple elections
- Bar chart visualization showing vote counts
- Winner highlighting with distinct visual treatment
- Timestamp of result publication

## Images

**Candidate Photos:**
- Placeholder: Use gradient avatars with initials or generic silhouette icons
- Aspect ratio: aspect-square (1:1)
- Size: 120px × 120px on cards, larger in detail views
- Border: Rounded (rounded-lg or rounded-full)
- Position: Top of candidate card, centered

**No Hero Sections:** This is a functional application—login pages and dashboards don't require hero imagery. Focus on clean, efficient layouts.

## Responsive Behavior

- Mobile: Single column, collapsible sidebar (hamburger menu)
- Tablet: 2-column layouts where appropriate
- Desktop: Full multi-column layouts with persistent sidebar
- Touch targets: Minimum 44×44px for all interactive elements

## Accessibility Standards

- WCAG AA compliance for text contrast
- Keyboard navigation support for all interactive elements
- Clear focus indicators (ring-2)
- ARIA labels for icon-only buttons
- Form validation with clear error messaging
- Screen reader friendly status announcements