-- Fictional sample data only. Safe to run in a local development database.
insert into public.brands (id, name, slug) values
('10000000-0000-4000-8000-000000000001','FreshGlow','freshglow'),
('10000000-0000-4000-8000-000000000002','PureNest','purenest')
on conflict (slug) do nothing;

insert into public.customers (id, brand_id, display_name, email) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Maya Patel','maya@example.test'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Jordan Lee','jordan@example.test')
on conflict (brand_id,id) do nothing;

insert into public.orders (id,brand_id,customer_id,order_number,product_name,delivery_status,delivered_at) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','FG-1042','Vitamin C Glow Serum','delivered',now() - interval '3 days'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','PN-2088','Botanical Body Lotion','delivered',now() - interval '12 days')
on conflict (brand_id,order_number) do nothing;

insert into public.conversations (id,brand_id,customer_id,order_id,subject,status) values
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Broken bottle on delivery','open'),
('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','Refund eligibility question','open')
on conflict (id) do nothing;

insert into public.messages (id,brand_id,conversation_id,sender_type,body,idempotency_key,created_at) values
('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','customer','My order was delivered but the bottle is broken. What can I do?','60000000-0000-4000-8000-000000000001',now() - interval '1 hour'),
('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002','customer','I received this 12 days ago. Can I get a refund?','60000000-0000-4000-8000-000000000002',now() - interval '30 minutes')
on conflict (conversation_id,idempotency_key) do nothing;

insert into public.knowledge_entries (brand_id,category,title,content,active) values
('10000000-0000-4000-8000-000000000001','returns','Damaged item returns','If an item arrives damaged, ask the customer for their order number and a clear photo of the damage within 7 days of delivery. Support may arrange a replacement or return after review; do not promise an outcome before verification.',true),
('10000000-0000-4000-8000-000000000001','refunds','FreshGlow refund window','Refund requests must be submitted within 14 calendar days after delivery. Refunds are reviewed after the returned item or damage evidence is verified. Approval is not automatic.',true),
('10000000-0000-4000-8000-000000000001','shipping','FreshGlow shipping policy','Standard delivery typically takes 3–5 business days after dispatch. Tracking information is shared when an order ships. Delivery estimates are not guarantees.',true),
('10000000-0000-4000-8000-000000000001','cancellations','FreshGlow cancellation policy','Orders can be cancelled before dispatch. Once dispatched, cancellation is not guaranteed; the customer can contact support to review return options.',true),
('10000000-0000-4000-8000-000000000002','returns','PureNest damaged item policy','Report damaged items within 5 calendar days of delivery with the order number and photos of the item and packaging. Support reviews evidence before determining available next steps.',true),
('10000000-0000-4000-8000-000000000002','refunds','PureNest refund window','Refund requests must be made within 7 calendar days of delivery. Requests outside this window are not eligible under the standard policy; do not promise an exception. Escalate exceptional circumstances for manual review.',true),
('10000000-0000-4000-8000-000000000002','shipping','PureNest shipping policy','Standard shipping usually takes 4–7 business days after dispatch. Weather and carrier delays may extend delivery. Check the carrier tracking record before giving a delivery estimate.',true),
('10000000-0000-4000-8000-000000000002','cancellations','PureNest cancellation policy','Cancellation requests are accepted only before order processing begins. Once processing starts, support can check the order status but cannot guarantee cancellation.',true)
on conflict do nothing;
