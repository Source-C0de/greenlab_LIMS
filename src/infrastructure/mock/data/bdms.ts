/**
 * Green Lab's business development managers (BDMs).
 *
 * The app has no `bdm` role — the BDM function is carried by `lab_manager`
 * (see the quotation-route note in `src/App.tsx`), so this collection is the
 * authoritative list of the people who can approve a quotation. It exists
 * because filtering `mockUsers` by role yields no usable picker: the only
 * `lab_manager` account is a single person.
 *
 * A quotation stores the approver's **id** and the printed document resolves
 * it to the name, so a name corrected here still prints correctly on
 * quotations issued before the correction.
 *
 * `signatureUrl` points at a hand-written signature PNG in
 * `public/signatures/`. It is OPTIONAL — a BDM without one still approves
 * quotations, and the document falls back to printing the name in a script
 * face instead of an image.
 *
 * Bilingual fields: `name` / `nameAr` (the project convention; see the
 * `add-mock-data` skill).
 */
export interface Bdm {
  id: string;
  name: string;
  nameAr: string;
  email: string;
  /** Hand-written signature image, when one exists for this person. */
  signatureUrl?: string;
}

export const mockBdms: Bdm[] = [
  {
    id: "B001",
    name: "Tala Al-Otaibi",
    nameAr: "تالا العتيبي",
    email: "tala.alotaibi@greenlablims.sa",
    signatureUrl: "/signatures/sign_tala.png",
  },
  {
    id: "B002",
    name: "Waleed Al-Harbi",
    nameAr: "وليد الحربي",
    email: "waleed.alharbi@greenlablims.sa",
    signatureUrl: "/signatures/sign_waleed.png",
  },
  {
    id: "B003",
    name: "Mona Al-Shamrani",
    nameAr: "منى الشمراني",
    email: "mona.alshamrani@greenlablims.sa",
  },
  {
    id: "B004",
    name: "Reem Al-Suwait",
    nameAr: "ريم السويقت",
    email: "reem.alsuwait@greenlablims.sa",
  },
];
