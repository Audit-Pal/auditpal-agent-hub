import re

with open("src/components/layout/TopNav.tsx", "r") as f:
    content = f.read()

# Find the 'return (\n'
match = re.search(r'  return \(\n', content)
if not match:
    print("Could not find return statement")
    exit(1)

pre_return = content[:match.start()]

new_return = """  return (
    <nav className="fixed top-0 left-0 right-0 z-[200] h-[60px] flex items-center justify-between px-5 md:px-[2.5rem] bg-[rgba(6,8,11,0.8)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.06)]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
      {/* Logo */}
      <Link to="/" className="flex items-center gap-[9px] text-[1rem] font-semibold tracking-[0.04em] text-[#eef1f6] transition-opacity hover:opacity-80 decoration-none">
        <span className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] bg-[#0fca8a]">
          <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[14px] w-[14px]">
            <path d="M7 1L12 4V10L7 13L2 10V4L7 1Z" stroke="#06080b" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M4.5 7L6.5 9L9.5 5" stroke="#06080b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        AuditPal
      </Link>

      {/* Desktop Nav */}
      <div className="hidden lg:flex items-center gap-[2rem]">
        {visibleNavItems.map((item) => {
          const isActive = item.active(pathname)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`text-[0.82rem] font-[400] transition-colors duration-200 decoration-none relative ${isActive ? 'text-[#eef1f6]' : 'text-[#7f8896] hover:text-[#eef1f6]'}`}
            >
              {item.label}
              {item.path === '/reports' && reportCount > 0 && (
                <span className="ml-[6px] rounded-full bg-[rgba(15,202,138,0.15)] px-[6px] py-[2px] text-[9px] font-bold text-[#0fca8a]">
                  {reportCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-[12px]">
        {user ? (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((v) => !v)}
              className="flex items-center gap-[8px] rounded-[5px] border border-[rgba(255,255,255,0.11)] bg-transparent px-[14px] py-[6px] transition-all duration-200 hover:border-[rgba(255,255,255,0.18)]"
              title="Click to view profile and logout"
            >
              <div className="flex h-[20px] w-[20px] items-center justify-center rounded-[4px] bg-[#0fca8a] text-[9px] font-bold uppercase text-[#06080b]">
                {user.name.substring(0, 2)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[0.8rem] font-[500] text-[#7f8896] hover:text-[#eef1f6] transition-colors leading-none">
                  {user.role === 'ORGANIZATION' ? 'New Organisation' : user.role === 'BOUNTY_HUNTER' ? 'New Agent' : user.name}
                </p>
              </div>
            </button>

            <AnimatePresence>
"""

# Extract the <AnimatePresence> block from original
# starting from `                    {isProfileOpen && (` up to `                  </AnimatePresence>`
dropdown_match = re.search(r'(\s*{isProfileOpen.*?)(?=\s*</AnimatePresence>)', content, re.DOTALL)
if not dropdown_match:
    print("Could not find dropdown block")
    exit(1)

dropdown_content = dropdown_match.group(1)

closing_content = """            </AnimatePresence>
          </div>
        ) : (
          <>
            <button
              className="hidden sm:block text-[0.8rem] font-[500] text-[#7f8896] bg-transparent border border-[rgba(255,255,255,0.11)] px-[18px] py-[7px] rounded-[5px] cursor-pointer transition-colors duration-200 hover:text-[#eef1f6] hover:border-[rgba(255,255,255,0.18)]"
              onClick={onLogin}
            >
              Sign In
            </button>
            <button
              className="text-[0.8rem] font-[600] text-[#06080b] bg-[#0fca8a] border-none px-[18px] py-[7px] rounded-[5px] cursor-pointer transition-opacity duration-200 hover:opacity-[0.88]"
              onClick={onLogin}
            >
              Get Access
            </button>
          </>
        )}

        {/* Mobile menu toggle */}
        <button
          onClick={() => setIsMobileMenuOpen((v) => !v)}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-[5px] border border-[rgba(255,255,255,0.11)] text-[#7f8896] transition hover:text-[#eef1f6]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isMobileMenuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile nav dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-[60px] left-0 right-0 bg-[#06080b] border-b border-[rgba(255,255,255,0.06)] px-5 py-4 flex flex-col gap-4 lg:hidden"
          >
            {visibleNavItems.map((item) => {
              const isActive = item.active(pathname)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-[0.9rem] font-[500] text-[#eef1f6] flex items-center justify-between ${isActive ? 'text-[#0fca8a]' : ''}`}
                >
                  {item.label}
                  {item.path === '/reports' && reportCount > 0 && (
                    <span className="rounded-full bg-[rgba(15,202,138,0.15)] px-[6px] py-[2px] text-[10px] font-bold text-[#0fca8a]">
                      {reportCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
"""

final = pre_return + new_return + dropdown_content + closing_content
with open("src/components/layout/TopNav.tsx", "w") as f:
    f.write(final)

print("Nav patched successfully.")
