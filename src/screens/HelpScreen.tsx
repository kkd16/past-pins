import { InfoPage, InfoSection } from '../settings/InfoPage';

export function HelpScreen() {
  return (
    <InfoPage>
      <InfoSection title="Explore your atlas">
        Drag one finger to move around. Pinch to zoom. On the globe, twist two
        fingers to rotate the view. The north control straightens the globe
        without changing your destination. Fit world restores the overview.
        Switch between Globe and World map at any time.
      </InfoSection>
      <InfoSection title="A tap, then a closer look">
        Tap a country for its name and status. Tap the small callout to open its
        details. Tap the ocean to close the callout. Search finds small
        countries and islands, too. Show on map takes you from a country’s
        details to its location.
      </InfoSection>
      <InfoSection title="Visited, Wishlist & Lived">
        Visited is where you’ve been. Wishlist is where you’d like to go. Lived
        is where you’ve called home, and always counts as Visited. You can mark
        multiple countries as Lived. Your current home is one of them. Moving
        home keeps your previous home in Lived.
      </InfoSection>
      <InfoSection title="Organize a few—or a lot">
        Search the country list, choose a status, and filter by continent. Not
        visited includes Wishlist places. Select lets you update several
        countries together. Bulk Mark visited keeps existing Lived places
        intact. To change an individual Lived place to Visited, use its details
        or status menu.
      </InfoSection>
      <InfoSection title="Undo a change">
        Undo restores the previous travel edit, including a home change or a
        group of countries. It leaves your preferences alone. The next travel
        edit replaces that Undo. Restoring a backup or clearing data cannot be
        undone.
      </InfoSection>
      <InfoSection title="Back up & restore">
        Export backup opens the iOS share sheet; choose Save to Files to keep a
        copy. Restore backup lets you pick a Past Pins JSON backup, review its
        totals, and replace all places, home, and preferences together.
      </InfoSection>
      <InfoSection title="Make it comfortable">
        The app follows your device’s text size and Reduce Motion settings.
        Country lists and map search offer an alternative to navigating the map
        by touch. Labels, the map summary, and haptics can be adjusted in
        Settings.
      </InfoSection>
    </InfoPage>
  );
}
