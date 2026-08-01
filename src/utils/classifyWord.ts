/**
 * Auto-categorizes a word into a "family" by regex-matching German and
 * English keywords. Lifted as-is from the original index.html.
 *
 * Known limitation (see docs/audit.md Section 2/3): this is hardcoded to
 * German/English vocabulary and does not generalize to other languages.
 * Replacing it (with AI-assisted tagging or manual-only assignment) is
 * Phase 1 work per docs/v2-plan.md, not part of this restructuring pass.
 */
export function classifyWord(germanWord: string, englishWord: string): string {
  const word = germanWord.toLowerCase();
  const translation = englishWord.toLowerCase();

  // Animals
  if (
    /hund|katze|vogel|fisch|pferd|maus|tier|kuh|schwein|schaf|huhn|ente|fuchs|bär|wolf|hase|reh|elefant|löwe|tiger|affe|schlange|frosch|insekt|biene|schmetterling/.test(
      word
    ) ||
    /dog|cat|bird|fish|horse|mouse|animal|cow|pig|sheep|chicken|duck|fox|bear|wolf|rabbit|deer|elephant|lion|tiger|monkey|snake|frog|insect|bee|butterfly/.test(
      translation
    )
  ) {
    return 'Animals';
  }

  // Food & Drink
  if (
    /brot|käse|milch|wasser|wein|bier|kaffee|tee|fleisch|fisch|gemüse|obst|apfel|birne|orange|banane|salat|suppe|kuchen|essen|trinken|restaurant|küche/.test(
      word
    ) ||
    /bread|cheese|milk|water|wine|beer|coffee|tea|meat|fish|vegetable|fruit|apple|pear|orange|banana|salad|soup|cake|eat|drink|food|restaurant|kitchen/.test(
      translation
    )
  ) {
    return 'Food & Drink';
  }

  // Emotions & Feelings
  if (
    /glück|freude|trauer|angst|liebe|hass|wut|furcht|hoffnung|gefühl|emotion|herz|seele|glücklich|traurig|froh|böse/.test(word) ||
    /happy|happiness|sad|sadness|fear|love|hate|anger|hope|feeling|emotion|heart|soul|joyful|afraid|angry/.test(translation)
  ) {
    return 'Emotions';
  }

  // Travel & Places
  if (
    /reise|stadt|land|berg|meer|fluss|strand|hotel|flug|zug|auto|straße|weg|platz|ort|welt|himmel|erde/.test(word) ||
    /travel|city|country|mountain|sea|ocean|river|beach|hotel|flight|train|car|street|road|place|world|sky|earth/.test(translation)
  ) {
    return 'Travel & Places';
  }

  // Time & Weather
  if (
    /zeit|tag|nacht|morgen|abend|woche|monat|jahr|uhr|stunde|minute|wetter|sonne|regen|schnee|wind|wolke|warm|kalt/.test(word) ||
    /time|day|night|morning|evening|week|month|year|clock|hour|minute|weather|sun|rain|snow|wind|cloud|warm|cold/.test(translation)
  ) {
    return 'Time & Weather';
  }

  // Body & Health
  if (
    /körper|kopf|hand|fuß|auge|ohr|nase|mund|arm|bein|herz|gesundheit|arzt|kranken|schmerz|krank|gesund/.test(word) ||
    /body|head|hand|foot|eye|ear|nose|mouth|arm|leg|heart|health|doctor|hospital|pain|sick|healthy/.test(translation)
  ) {
    return 'Body & Health';
  }

  // Colors & Appearance
  if (
    /farbe|rot|blau|grün|gelb|schwarz|weiß|braun|grau|rosa|orange|lila|schön|hässlich|groß|klein|lang|kurz/.test(word) ||
    /color|red|blue|green|yellow|black|white|brown|gray|grey|pink|orange|purple|beautiful|ugly|big|small|long|short/.test(translation)
  ) {
    return 'Colors & Appearance';
  }

  // Numbers & Quantities
  if (
    /zahl|eins|zwei|drei|vier|fünf|viel|wenig|mehr|weniger|alle|einige|manche/.test(word) ||
    /number|one|two|three|four|five|many|few|more|less|all|some/.test(translation)
  ) {
    return 'Numbers & Quantities';
  }

  // People & Relationships
  if (
    /mensch|mann|frau|kind|baby|mutter|vater|bruder|schwester|freund|familie|leute|person/.test(word) ||
    /person|people|man|woman|child|baby|mother|father|brother|sister|friend|family/.test(translation)
  ) {
    return 'People & Family';
  }

  // Actions & Verbs
  if (
    /gehen|kommen|machen|tun|sagen|sprechen|hören|sehen|denken|wissen|können|müssen|wollen|haben|sein|werden/.test(word) ||
    /go|come|make|do|say|speak|hear|see|think|know|can|must|want|have|be|become/.test(translation)
  ) {
    return 'Actions';
  }

  // Default category
  return 'General';
}
