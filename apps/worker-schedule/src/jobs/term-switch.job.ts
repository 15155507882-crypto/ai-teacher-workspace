import { ACADEMIC_YEAR_START_MONTH, SEMESTER_FIRST, SEMESTER_SECOND } from '@workspace/shared';

export class TermSwitchJob {
  static check() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let academicYear: string;
    if (month >= ACADEMIC_YEAR_START_MONTH) {
      academicYear = `${year}-${year + 1}学年`;
    } else {
      academicYear = `${year - 1}-${year}学年`;
    }

    const semester = month >= 9 || month <= 1 ? SEMESTER_FIRST : SEMESTER_SECOND;

    console.log(
      `[Worker-Schedule] Current term: ${academicYear} ${semester} (${now.toISOString()})`
    );
  }
}
