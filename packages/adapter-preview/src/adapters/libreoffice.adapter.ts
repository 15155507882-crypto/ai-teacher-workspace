import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IPreviewAdapter } from '../preview-adapter.interface';
import { PreviewInput, PreviewResult, PreviewType } from '../types';

const execFileAsync = promisify(execFile);

export class LibreOfficeAdapter implements IPreviewAdapter {
  private libreOfficePath: string;

  constructor(config?: { libreOfficePath?: string }) {
    this.libreOfficePath = config?.libreOfficePath || 'libreoffice';
  }

  async convert(input: PreviewInput): Promise<PreviewResult> {
    const ext = path.extname(input.inputPath).toLowerCase();

    // PDF pass-through: no conversion needed, just copy
    if (ext === '.pdf') {
      const outputPath = path.join(
        input.outputDir,
        `${path.basename(input.inputPath, '.pdf')}.pdf`
      );
      await fs.copyFile(input.inputPath, outputPath);
      return { outputPath, previewType: 'pdf', pageCount: 0 };
    }

    // Excel: convert to PDF
    if (['.xls', '.xlsx', '.csv'].includes(ext)) {
      return this.convertWithLibreOffice(input, 'pdf');
    }

    // PPT: convert to PDF
    if (['.ppt', '.pptx'].includes(ext)) {
      return this.convertWithLibreOffice(input, 'pdf');
    }

    // Word: convert to PDF (V2: PDF preview instead of HTML)
    if (['.doc', '.docx'].includes(ext)) {
      return this.convertWithLibreOffice(input, 'pdf');
    }

    throw new Error(`Unsupported file type: ${ext}`);
  }

  private async convertWithLibreOffice(
    input: PreviewInput,
    targetFormat: 'pdf' | 'html'
  ): Promise<PreviewResult> {
    const inputFile = path.resolve(input.inputPath);
    const outputDir = path.resolve(input.outputDir);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    try {
      // Run LibreOffice headless conversion
      // Output file will be placed in outputDir with the same name but new extension
      const { stdout, stderr } = await execFileAsync(
        this.libreOfficePath,
        ['--headless', '--convert-to', targetFormat, '--outdir', outputDir, inputFile],
        {
          timeout: 120000, // 2 min timeout for large files
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );

      const baseName = path.basename(inputFile, path.extname(inputFile));
      const outputPath = path.join(outputDir, `${baseName}.${targetFormat}`);

      // Verify output file exists
      try {
        await fs.access(outputPath);
      } catch {
        throw new Error(
          `LibreOffice conversion failed: output file not found at ${outputPath}. stderr: ${stderr}`
        );
      }

      return {
        outputPath,
        previewType: targetFormat as PreviewType,
        pageCount: 0,
      };
    } catch (error: any) {
      if (error?.killed && error?.signal === 'SIGTERM') {
        throw new Error('LibreOffice conversion timed out (2 minutes)');
      }
      throw new Error(
        `LibreOffice conversion failed: ${error.message || error}. stdout: ${error.stdout || ''}`
      );
    }
  }

  isSupported(extension: string): boolean {
    const supported = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'pdf'];
    return supported.includes(extension.toLowerCase());
  }

  getTargetType(extension: string): PreviewType | null {
    const ext = extension.toLowerCase();
    // V2: All Office documents → PDF
    if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv'].includes(ext)) return 'pdf';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    return null;
  }
}
