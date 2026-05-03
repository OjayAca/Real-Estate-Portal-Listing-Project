# EstateFlow Nonfunctional Feature Completion Plan         


## Summary                                                                                      
                                                                                                  
  Static inspection plus npm run build, npm run lint, and php artisan test show the app builds    
  and tests pass, but several product workflows are incomplete or backend-only. The main gaps     
  are buyer activity management, viewing booking UI, password reset UI, seller lead management,   
  and the “Coming Soon” account settings.                                                         
                                                                                                  
  ## Currently Not Functional Or Incomplete                                                       
                                                                                                  
  - Password reset: backend routes exist, but there is no forgot-password/reset-password          
    frontend flow; /login?token=...&email=... is ignored.                                                                                                                                                  
  - Seller leads: /sell stores leads, but admins/agents cannot view, assign, update, or convert   
    them.                                                                                         
  - Admin oversight: admin UI does not render recent inquiries, seller leads.   

  - Account settings “Coming Soon”: password change, 2FA, social sign-in, saved searches, alert   
    preferences, communication preferences, assigned agent info, and language preference are      
    disabled placeholders.                                                                        
  - Agent/profile management: no UI for agent avatar/photo, agency profile details, or richer     
    agent profile updates beyond basic account name/phone.                                        
  - Agent reviews: backend works only after a past/completed viewing, but buyers have no booking  
    history or prompt explaining eligibility.                                                     
  - Property detail actions: details drawer has no inquiry/book-viewing CTA; saved listing        
    details cannot contact/book; agent profile active listing links route to /properties instead  
    of opening the selected listing.                                                              
                                                                                                                                                                   
  ## Phase 1: Complete Auth And Account Settings                                                  
                                                                                                  
  - Add forgot-password and reset-password screens connected to /auth/forgot-password and /auth/  
    reset-password.                                                                               
  - Make reset links route to a dedicated frontend reset form instead of ignored /login query     
    params.                                                                                       
  - Implement password change in account settings.                                                
  - Keep 2FA and social sign-in out of scope unless provider credentials and security             
    requirements are defined.                                                                     
                                                                                                  
  ## Phase 2: Build Staff Lead And Operations Tools                                               
                                                                                                  
  - Add admin seller lead management: list, search, status, notes, assignment, and conversion     
    path to listing or agent follow-up.                                                           
  - Add admin views for recent inquiries and viewing bookings with status visibility.             
  - Notify admins on new seller leads, and optionally notify assigned agents when a lead is       
    assigned.                                                                                     
  - Add backend tests for seller lead admin listing, status updates, assignment, and              
    authorization.                                                                                
                                                                                                  
  ## Phase 3: Improve Agent And Review Experience                                                 
                                                                                                  
  - Add agent profile editing for bio, agency name, phone, and optional avatar/photo.             
  - Add agency profile management only for fields already in the schema: website, phone, email,   
    description.                                                                                  
  - Add buyer review prompts from completed/past bookings and show eligibility errors before      
    submit.                                                                                       
  - Fix agent active listing links so they open the actual property in /buy or /rent.             
                                                                                                  
  ## Phase 4: Preferences, Alerts, And Polish                                                     
                                                                                                  
  - Implement saved search criteria and alert preferences after buyer dashboard and booking       
    flows are complete.                                                                           
  - Add notification preferences only for channels the app actually supports; current             
    implementation is in-app polling.                                                             
  - Replace placeholder settings sections with either working forms or remove them until          
    implemented.                                                                                  
  - Add regression coverage for buyer dashboard, booking UI, password reset, seller lead admin    
    workflows, and property detail CTAs.                                                          
                                                                                                  
  ## Public API / Interface Changes                                                               
                                                                                                  
  - Add frontend routes: /forgot-password, /reset-password, and a buyer dashboard/activity        
    route.                                                                                        
  - Add admin seller lead endpoints if not already present: index, show/update status, assign,    
    and notes.                                                                                    
  - Extend seller lead data with operational fields if needed: status, assigned_agent_id,         
    admin_notes, and timestamps.                                                                  
  - No breaking changes to existing property, inquiry, booking, or auth endpoints are required.   
                                                                                            

  ## Assumptions

  - “Functional” means usable from the frontend, not just available as a backend endpoint.        
  - Social login and 2FA remain deferred unless provider/security requirements are supplied.      
  - Existing user edits in frontend/src/pages/HomePage.jsx should be preserved.