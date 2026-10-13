import type { ReactNode } from 'react';

export interface SocialLink {
  icon: ReactNode;
  href: string;
  label: string;
}
export interface FooterLinkGroup {
  title: string;
  links: { id: string; content: ReactNode }[];
}
export interface Footer2Props {
  logo: ReactNode;
  tagline: string;
  socialLinks: SocialLink[];
  socialText: string;
  linkGroups: FooterLinkGroup[];
  copyright: string;
  action: ReactNode;
}

// Adapted from https://registry.watermelon.sh/r/footer-2.json.
export function Footer2({
  logo,
  tagline,
  socialLinks,
  socialText,
  linkGroups,
  copyright,
  action,
}: Footer2Props) {
  return (
    <div className="footer-two">
      <div className="footer-two-brand">
        {logo}
        <h2>{tagline}</h2>
        <div className="footer-two-socials">
          <p>{socialText}</p>
          <div>
            {socialLinks.map((social) => (
              <a
                key={social.href}
                href={social.href}
                aria-label={social.label}
                title={social.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="footer-two-content">
        <div className="footer-two-groups">
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.links.map((link) => (
                  <li key={link.id}>{link.content}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-two-bottom">
          <p>{copyright}</p>
          {action}
        </div>
      </div>
    </div>
  );
}
