export interface MarkdownProfile {
  id: string
  name: string
  /** 空值作为默认规则；非空时按正则匹配页面 URL */
  urlPattern: string
  headingStyle: 'atx' | 'setext'
  hr: string
  br: string
  bulletListMarker: '-' | '+' | '*'
  codeBlockStyle: 'fenced' | 'indented'
  emDelimiter: '*' | '_'
  fence: '```' | '~~~'
  strongDelimiter: '**' | '__'
  linkStyle: 'inlined' | 'referenced'
  linkReferenceStyle: 'full' | 'collapsed' | 'shortcut'
  preformattedCode: boolean
}

export interface DocScrapeConfig {
  /** 导出时是否添加 YAML frontmatter */
  includeFrontmatter: boolean
  /** frontmatter 字段模板 */
  frontmatterTemplate: string
  /** 文件名模板，支持 {{title}} {{date}} {{selector}} */
  filenameTemplate: string
  /** 实验功能：下载 Markdown 时同时打包远程图片 */
  packageImages: boolean
  /** 图片在 zip 中保存的目录 */
  mediaDirectory: string
  /** 图片下载并发数 */
  imageConcurrency: number
  /** GitHub personal access token，仅保存在浏览器本地存储 */
  githubToken: string
  /** GitHub 仓库，格式为 owner/repo */
  githubRepository: string
  /** Markdown 在仓库内保存的目录 */
  githubDirectory: string
  /** 目标分支；空值使用仓库默认分支 */
  githubBranch: string
  /** Markdown 转换配置组，按 URL 正则选择 */
  profiles: MarkdownProfile[]
}

export const defaultMarkdownProfile: MarkdownProfile = {
  id: 'default',
  name: '通用',
  urlPattern: '',
  headingStyle: 'atx',
  hr: '---',
  br: '  ',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  fence: '```',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  linkReferenceStyle: 'full',
  preformattedCode: false,
}

export const defaultConfig: DocScrapeConfig = {
  includeFrontmatter: true,
  frontmatterTemplate: '---\ntitle: {{title}}\nurl: {{url}}\ndate: {{date}}\n---\n\n',
  filenameTemplate: '{{title}}.md',
  packageImages: false,
  mediaDirectory: 'media',
  imageConcurrency: 3,
  githubToken: '',
  githubRepository: '',
  githubDirectory: 'posts',
  githubBranch: '',
  profiles: [defaultMarkdownProfile],
}

const STORAGE_KEY = 'docscrape_config'

export async function getConfig(options: { includeSecrets?: boolean } = {}): Promise<DocScrapeConfig> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const saved = (result[STORAGE_KEY] || {}) as Partial<DocScrapeConfig> & {
    headingStyle?: MarkdownProfile['headingStyle']
    codeBlockStyle?: MarkdownProfile['codeBlockStyle']
  }
  const config = {
    ...defaultConfig,
    ...saved,
    profiles: normalizeProfiles(saved.profiles, saved),
  }
  if (options.includeSecrets === false)
    config.githubToken = ''
  return config
}

export async function saveConfig(config: DocScrapeConfig): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: config })
}

export function applyTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '')
}

export function normalizeProfile(profile: Partial<MarkdownProfile>, index = 0): MarkdownProfile {
  return {
    ...defaultMarkdownProfile,
    ...profile,
    id: profile.id || `profile-${Date.now()}-${index}`,
    name: profile.name || `规则 ${index + 1}`,
    urlPattern: profile.urlPattern || '',
  }
}

export function normalizeProfiles(
  profiles: Partial<MarkdownProfile>[] | undefined,
  legacy: { headingStyle?: MarkdownProfile['headingStyle'], codeBlockStyle?: MarkdownProfile['codeBlockStyle'] } = {},
) {
  if (profiles?.length)
    return profiles.map(normalizeProfile)

  return [{
    ...defaultMarkdownProfile,
    headingStyle: legacy.headingStyle || defaultMarkdownProfile.headingStyle,
    codeBlockStyle: legacy.codeBlockStyle || defaultMarkdownProfile.codeBlockStyle,
  }]
}

export function resolveMarkdownProfile(config: DocScrapeConfig | null, url: string) {
  const profiles = config?.profiles?.length ? config.profiles : [defaultMarkdownProfile]
  for (const profile of profiles) {
    if (!profile.urlPattern.trim())
      continue
    try {
      if (new RegExp(profile.urlPattern).test(url))
        return profile
    }
    catch {
      // Ignore invalid user-provided patterns and continue to the fallback.
    }
  }
  return profiles.find(profile => !profile.urlPattern.trim()) || profiles[0] || defaultMarkdownProfile
}
